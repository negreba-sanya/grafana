package folderimpl

import (
	"context"
	"fmt"
	"runtime"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"github.com/grafana/dskit/concurrency"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/folder"
)

const MIGRATION_ID = "folder_tree_set_lft_rgt_columns_migration"

type treeStore struct {
	sqlStore
	db  db.DB
	log log.Logger
}

func ProvideTreeStore(db db.DB) (*treeStore, error) {
	logger := log.New("folder-tree-store")
	store := &treeStore{
		db:  db,
		log: logger,
	}
	store.sqlStore = sqlStore{db: db, log: logger}

	if err := store.migrate(); err != nil {
		return nil, folder.ErrInternal.Errorf("failed to migrate tree: %w", err)
	}

	return store, nil
}

func (hs *treeStore) migrate() error {
	return hs.db.RunAndRegisterCodeMigration(context.Background(), MIGRATION_ID, func(sess *db.Session) error {
		if err := hs.db.WithDbSession(context.Background(), func(sess *db.Session) error {
			var orgIDs []int64
			if err := sess.SQL("SELECT DISTINCT org_id FROM folder").Find(&orgIDs); err != nil {
				return err
			}

			return concurrency.ForEachJob(context.Background(), len(orgIDs), runtime.NumCPU(), func(ctx context.Context, idx int) error {
				if err := hs.migrateTreeForOrg(orgIDs[idx]); err != nil {
					return folder.ErrInternal.Errorf("failed to migrate tree for org: %w", err)
				}
				return nil
			})
		}); err != nil {
			return folder.ErrInternal.Errorf("failed to migrate tree: failed to get org IDs: %w", err)
		}
		return nil
	})
}

func (hs *treeStore) migrateTreeForOrg(orgID int64) error {
	_, err := hs.resetLeftRightCols(context.Background(), orgID, nil, 0)
	return err
}

func (hs *treeStore) resetLeftRightCols(ctx context.Context, orgID int64, f *folder.Folder, counter int64) (int64, error) {
	err := hs.db.InTransaction(ctx, func(ctx context.Context) error {
		var children []*folder.Folder

		// TODO do we need SELECT FOR UPDATE here?
		q := "SELECT org_id, uid, title, lft, rgt FROM folder WHERE org_id = ?"
		args := []interface{}{orgID}
		// get children
		if f == nil {
			q += " AND parent_uid IS NULL"
		} else {
			q += " AND parent_uid = ?"
			args = append(args, f.UID)
		}
		// used for consistency
		q += " ORDER BY title ASC"

		if err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
			if err := sess.SQL(q, args...).Find(&children); err != nil {
				return err
			}
			return nil
		}); err != nil {
			return folder.ErrInternal.Errorf("migration failure: failed to get children: %w", err)
		}

		if len(children) == 0 {
			counter++
			if f != nil {
				f.Rgt = counter
			}
			// terminate recursion
			return nil
		}

		for _, child := range children {
			existingLft := child.Lft
			existingRgt := child.Rgt
			counter++
			child.Lft = counter
			c, err := hs.resetLeftRightCols(ctx, orgID, child, counter)
			if err != nil {
				return err
			}
			if err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
				if existingLft == child.Lft && existingRgt == child.Rgt {
					return nil
				}
				_, err := sess.Exec("UPDATE folder SET lft = ?, rgt = ? WHERE uid = ? AND org_id = ?", child.Lft, child.Rgt, child.UID, child.OrgID)
				if err != nil {
					return err
				}
				return nil
			}); err != nil {
				return folder.ErrInternal.Errorf("migration failure: failed to update left and right columns: %w", err)
			}
			counter = c
		}
		counter++
		if f != nil {
			f.Rgt = counter
		}
		return nil
	})

	return counter, err
}

func (hs *treeStore) Create(ctx context.Context, cmd folder.CreateFolderCommand) (*folder.Folder, error) {
	if cmd.UID == "" {
		return nil, folder.ErrBadRequest.Errorf("missing UID")
	}

	foldr := &folder.Folder{}
	now := time.Now()

	cols := []string{"org_id", "uid", "title", "description", "created", "updated", "lft", "rgt"}
	if err := hs.db.InTransaction(ctx, func(ctx context.Context) error {
		if err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
			if cmd.ParentUID == "" {
				maxRgt := 0
				if _, err := sess.SQL("SELECT  MAX(rgt) FROM folder WHERE org_id = ?", cmd.OrgID).Get(&maxRgt); err != nil {
					return err
				}

				insertSQL := fmt.Sprintf("INSERT INTO folder(%s) VALUES(%s)", strings.Join(cols, ","), strings.Join(strings.Split(strings.Repeat("?", len(cols)), ""), ","))
				if _, err := sess.Exec(insertSQL, cmd.OrgID, cmd.UID, cmd.Title, cmd.Description, now, now, maxRgt+1, maxRgt+2); err != nil {
					return err
				}
				return nil
			}

			if _, err := hs.Get(ctx, folder.GetFolderQuery{
				UID:   &cmd.ParentUID,
				OrgID: cmd.OrgID,
			}); err != nil {
				return folder.ErrFolderNotFound.Errorf("parent folder does not exist")
			}

			var parentRgt int64
			if _, err := sess.SQL("SELECT rgt FROM folder WHERE uid = ? AND org_id = ?", cmd.ParentUID, cmd.OrgID).Get(&parentRgt); err != nil {
				return err
			}

			if r, err := sess.Exec("UPDATE folder SET rgt = rgt + 2 WHERE rgt >= ? AND org_id = ?", parentRgt, cmd.OrgID); err != nil {
				if rowsAffected, err := r.RowsAffected(); err == nil {
					hs.log.Info("Updated rgt column in folder table", "rowsAffected", rowsAffected)
				}
				return err
			}

			if r, err := sess.Exec("UPDATE folder SET lft = lft + 2 WHERE lft > ? AND org_id = ?", parentRgt, cmd.OrgID); err != nil {
				if rowsAffected, err := r.RowsAffected(); err == nil {
					hs.log.Info("Updated lft column in folder table", "rowsAffected", rowsAffected)
				}
				return err
			}

			cols = append(cols, "parent_uid")
			insertSQL := fmt.Sprintf("INSERT INTO folder(%s) VALUES(%s)", strings.Join(cols, ","), strings.Join(strings.Split(strings.Repeat("?", len(cols)), ""), ","))
			if _, err := sess.Exec(insertSQL, cmd.OrgID, cmd.UID, cmd.Title, cmd.Description, now, now, parentRgt, parentRgt+1, cmd.ParentUID); err != nil {
				return err
			}
			return nil
		}); err != nil {
			return err
		}

		if err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
			if _, err := sess.SQL("SELECT * FROM folder WHERE uid = ? AND org_id = ?", cmd.UID, cmd.OrgID).Get(foldr); err != nil {
				return err
			}
			return nil
		}); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return foldr, err
	}

	return foldr.WithURL(), nil
}

// Delete deletes a folder and all its descendants
func (hs *treeStore) Delete(ctx context.Context, uid string, orgID int64) error {
	if err := hs.db.InTransaction(ctx, func(ctx context.Context) error {
		if err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
			type res struct {
				Lft   int64
				Rgt   int64
				Width int64
			}
			var r res
			if _, err := sess.SQL("SELECT lft, rgt, rgt - lft + 1 AS width FROM folder WHERE uid = ? AND org_id = ?", uid, orgID).Get(&r); err != nil {
				return err
			}

			if _, err := sess.Exec("DELETE FROM folder WHERE lft >= ? AND rgt <= ? AND org_id = ?", r.Lft, r.Rgt, orgID); err != nil {
				return err
			}

			if _, err := sess.Exec("UPDATE folder SET rgt = rgt - ? WHERE rgt > ? AND org_id = ?", r.Width, r.Rgt, orgID); err != nil {
				return err
			}

			if _, err := sess.Exec("UPDATE folder SET lft = lft - ? WHERE lft > ? AND org_id = ?", r.Width, r.Rgt, orgID); err != nil {
				return err
			}

			return nil
		}); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}
	return nil
}

func (hs *treeStore) Update(ctx context.Context, cmd folder.UpdateFolderCommand) (*folder.Folder, error) {
	var foldr *folder.Folder
	var err error
	if err := hs.db.InTransaction(ctx, func(ctx context.Context) error {
		if foldr, err = hs.sqlStore.Update(ctx, cmd); err != nil {
			return err
		}

		// if it's a move operation update the left and right columns of the affected nodes appropriately
		if cmd.NewParentUID != nil {
			if _, err := hs.resetLeftRightCols(ctx, cmd.OrgID, nil, 0); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return foldr, err
	}

	// NOTE: left and right cols are not updated in the foldr object
	return foldr.WithURL(), nil
}

// Get returns a folder ancestors ordered by left column ascending
func (hs *treeStore) GetParents(ctx context.Context, cmd folder.GetParentsQuery) ([]*folder.Folder, error) {
	var folders []*folder.Folder
	err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
		if err := sess.SQL(`
		SELECT parent.*
		FROM folder AS node,
			folder AS parent
		WHERE node.lft > parent.lft AND node.lft < parent.rgt
			AND node.org_id = ? AND node.uid = ?
		ORDER BY parent.lft
		`, cmd.OrgID, cmd.UID).Find(&folders); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if err := concurrency.ForEachJob(ctx, len(folders), runtime.NumCPU(), func(ctx context.Context, idx int) error {
		folders[idx].WithURL()
		return nil
	}); err != nil {
		hs.log.Debug("failed to set URL to folders", "err", err)
	}
	return folders, nil
}

func (hs *treeStore) GetHeight(ctx context.Context, foldrUID string, orgID int64, _ *string) (int, error) {
	var paths []string
	if err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
		// group_concat() is used to get the paths of the leaf nodes where the given folder is present
		// the order of the group_concat() in SQLite is arbitrary, so we need to include the lft column in order to sort the paths later
		// the path format is <lft><pathSep><uid>
		leafSubpaths := hs.db.GetDialect().GroupConcat(hs.db.GetDialect().Concat("parent.lft", fmt.Sprintf("'%s'", PATH_SEPARATOR), "parent.uid"), FULLPATH_GROUPCONCAT_SEPARATOR)
		folderInPath := hs.db.GetDialect().Position(hs.db.GetDialect().GroupConcat("parent.uid", FULLPATH_GROUPCONCAT_SEPARATOR), "?")
		s := fmt.Sprintf(`SELECT %s
		FROM folder AS node,
			folder AS parent
		WHERE node.org_id = ? AND node.lft >= parent.lft AND node.lft <= parent.rgt
		AND node.rgt = node.lft + 1 -- leaf nodes
		GROUP BY node.uid
		HAVING %s > 0 -- folder appears in the subpath
		`, leafSubpaths, folderInPath)
		return sess.SQL(s, orgID, foldrUID).Find(&paths)
	}); err != nil {
		return 0, folder.ErrInternal.Errorf("failed to get folder height: failed to get leaf subpaths: %w", err)
	}

	// get the length of the maximum path
	var height uint32
	if err := concurrency.ForEachJob(ctx, len(paths), runtime.NumCPU(), func(ctx context.Context, i int) error {
		ancestors := strings.Split(paths[i], FULLPATH_GROUPCONCAT_SEPARATOR)
		sort.Slice(ancestors, func(j, k int) bool {
			return strings.Split(ancestors[j], PATH_SEPARATOR)[0] < strings.Split(ancestors[k], PATH_SEPARATOR)[0]
		})
		index := 0
		for l, ancestor := range ancestors {
			if strings.Split(ancestor, PATH_SEPARATOR)[1] == foldrUID {
				index = l
				break
			}
		}

		v := len(ancestors[index:]) - 1
		if v > int(height) {
			atomic.StoreUint32(&height, uint32(v))
		}
		return nil
	}); err != nil {
		return 0, folder.ErrInternal.Errorf("failed to get folder height: failed to compute max path length: %w", err)
	}

	return int(height), nil
}

/*
func (hs *treeStore) GetSubtree(ctx context.Context, orgID int64, UID *string) ([]*folder.Folder, error) {
	var folders []*folder.Folder
	groupConcatSep := ","
	err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
		subpaths := hs.db.GetDialect().GroupConcat("parent.uid", groupConcatSep)
		q := fmt.Sprintf(`
		SELECT %s AS fullpath, node.*
		FROM folder AS node,
			folder AS parent,
			folder AS root
		WHERE node.lft BETWEEN root.lft AND root.rgt AND node.org_id = ? AND root.uid = ?
		ORDER BY node.lft
		`, subpaths)
		if err := sess.SQL(q, orgID, *UID).Find(&folders); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if err := concurrency.ForEachJob(ctx, len(folders), runtime.NumCPU(), func(ctx context.Context, idx int) error {
		folders[idx].WithURL()
		return nil
	}); err != nil {
		hs.log.Debug("failed to set URL to folders", "err", err)
	}
	return folders, nil
}
*/

func (hs *treeStore) GetFolders(ctx context.Context, orgID int64, uids ...string) ([]*folder.Folder, error) {
	var folders []*folder.Folder
	if err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
		b := strings.Builder{}
		args := make([]any, 0, len(uids)+1)

		fullpath := hs.db.GetDialect().GroupConcat(hs.db.GetDialect().Concat("parent.lft", fmt.Sprintf("'%s'", PATH_SEPARATOR), "parent.uid"), FULLPATH_GROUPCONCAT_SEPARATOR)
		b.WriteString(fmt.Sprintf(`
		SELECT %s AS fullpath, node.*
		FROM folder AS node,
			folder AS parent
		WHERE node.lft > parent.lft AND node.rgt < parent.rgt AND node.org_id = ?
		`, fullpath))
		args = append(args, orgID)
		for i, uid := range uids {
			if i == 0 {
				b.WriteString("  AND (")
			}

			if i > 0 {
				b.WriteString(" OR ")
			}
			b.WriteString(" node.uid=? ")
			args = append(args, uid)

			if i == len(uids)-1 {
				b.WriteString(")")
			}
		}
		b.WriteString(" GROUP BY node.uid ORDER BY fullpath")
		return sess.SQL(b.String(), args...).Find(&folders)
	}); err != nil {
		return nil, err
	}

	if err := concurrency.ForEachJob(ctx, len(folders), runtime.NumCPU(), func(ctx context.Context, idx int) error {
		f := folders[idx]
		ancestors := strings.Split(f.Fullpath, FULLPATH_GROUPCONCAT_SEPARATOR)
		sort.Slice(ancestors, func(j, k int) bool {
			return strings.Split(ancestors[j], PATH_SEPARATOR)[0] < strings.Split(ancestors[k], PATH_SEPARATOR)[0]
		})
		f.Fullpath = strings.Join(ancestors, FULLPATH_GROUPCONCAT_SEPARATOR)
		return nil
	}); err != nil {
		return nil, err
	}

	return folders, nil
}

func (hs *treeStore) getTree(ctx context.Context, orgID int64) ([]string, error) {
	var tree []string
	err := hs.db.WithDbSession(ctx, func(sess *db.Session) error {
		q := fmt.Sprintf(`
		SELECT %s
		FROM folder AS node, folder AS parent
		WHERE node.lft BETWEEN parent.lft AND parent.rgt AND node.org_id = ?
		GROUP BY node.title, node.lft
		ORDER BY node.lft
		`, hs.db.GetDialect().Concat("COUNT(parent.title)", "'-'", "node.title"))
		if err := sess.SQL(q, orgID).Find(&tree); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return tree, nil
}
