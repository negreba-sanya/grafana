/* eslint @grafana/no-untranslated-strings: 0 */
/* eslint @grafana/no-border-radius-literal: 0 */

import { css, cx } from '@emotion/css';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Icon, Portal, useStyles2 } from '@grafana/ui';

import { CommandPaletteDividerItem, CommandPaletteItem } from './types';
import { useNavItems } from './useNavItems';
import { useRecentDashboards } from './useRecentDashboards';

// interface CommandPalette2Props {}

const PAGES_DIVIDER: CommandPaletteDividerItem = { type: 'divider', title: 'Pages' };
const DASH_DIVIDER: CommandPaletteDividerItem = { type: 'divider', title: 'Dashboards' };
const FAKE_DASH_ITEMS: CommandPaletteItem[] = [
  { type: 'result', title: 'Dashboards squad', icon: 'apps', parentTitle: 'UI experiments' },
  {
    type: 'result',
    title: 'Dashboard with adhoc filtering',
    icon: 'apps',
    parentTitle: 'Grafana Frontend Division',
  },
  { type: 'result', title: 'Cloud Logs Export Insights', icon: 'apps', parentTitle: 'GrafanaCloud' },
  {
    type: 'result',
    title: 'Usage Insights - 6 - Loki Query Fair Usage Drilldown',
    icon: 'apps',
    parentTitle: 'GrafanaCloud',
  },
  { type: 'result', title: 'USE Method / Node', icon: 'apps', parentTitle: 'Linux Node' },
];

const FAKE_BASE_ITEMS: CommandPaletteItem[] = [
  { type: 'divider', title: 'Folders' },
  { type: 'result', title: 'Dashboards squad', icon: 'folder-open', parentTitle: 'Grafana Frontend Division' },
];

export function CommandPalette2() {
  const styles = useStyles2(getStyles);
  const modKey = '⌘'; /*useMemo(() => getModKey(), []);*/
  const [keyState, setKeyState] = useState({ up: false, down: false });

  const recentDashboardItems = useRecentDashboards();
  const navItems = useNavItems();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowDown') {
        setKeyState((old) => ({ ...old, down: true }));
      }

      if (ev.key === 'ArrowUp') {
        setKeyState((old) => ({ ...old, up: true }));
      }
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowDown') {
        setKeyState((old) => ({ ...old, down: false }));
      }

      if (ev.key === 'ArrowUp') {
        setKeyState((old) => ({ ...old, up: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const items = useMemo(() => {
    return [...FAKE_BASE_ITEMS, DASH_DIVIDER, ...recentDashboardItems, ...FAKE_DASH_ITEMS, PAGES_DIVIDER, ...navItems];
  }, [navItems, recentDashboardItems]);

  const filteredItems = useMemo(() => {
    if (inputValue.length === 0) {
      return items;
    }

    return items.filter((item) => {
      if (item.type === 'divider') {
        return true;
      }

      return (
        item.title.toLowerCase().includes(inputValue.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(inputValue.toLowerCase())
      );
    });
  }, [inputValue, items]);

  return (
    <Portal>
      <div className={styles.wrapper}>
        <div className={styles.palette}>
          <div className={styles.inputBarCell}>
            <Icon name="search" />

            <input
              className={styles.searchInput}
              onChange={(ev) => setInputValue(ev.currentTarget.value)}
              value={inputValue}
              type="text"
              placeholder="Search for anything..."
            />

            <div className={styles.shortcut}>
              <span className={styles.keyboardKey}>{modKey}</span>
              <span className={styles.keyboardKey}>K</span>
            </div>
          </div>

          <div className={styles.mainCell}>
            {filteredItems.map((item, idx) => {
              const nextItem = filteredItems[idx + 1];
              if (item.type === 'divider' && nextItem?.type === 'divider') {
                return null;
              }

              if (item.type === 'divider') {
                return (
                  <div key={idx} className={styles.dividerItem}>
                    <div>{item.title}</div>
                    <div className={styles.dividerDivider} />
                  </div>
                );
              }

              return (
                <div key={idx} className={styles.resultItem}>
                  <Icon name={item.icon} />
                  <div>{item.title}</div>
                  {item.parentTitle && (
                    <div>
                      {item.parentIcon && <Icon name={item.parentIcon} />} {item.parentTitle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* <div className={styles.detailCell}>detail</div> */}

          <div className={styles.footerCell}>
            <div className={styles.shortcut}>
              <motion.span
                animate={{ color: keyState.up ? '#FFFFFF' : '#9D9DAD' }}
                transition={{ duration: 0.1 }}
                className={styles.keyboardKey}
              >
                <motion.span style={{ display: 'inline-block' }} animate={{ y: keyState.up ? -2 : 0 }}>
                  <Icon name="arrow-up" />
                </motion.span>
              </motion.span>
              <motion.span
                animate={{ color: keyState.down ? '#FFFFFF' : '#9D9DAD' }}
                transition={{ duration: 0.1 }}
                className={styles.keyboardKey}
              >
                <motion.span style={{ display: 'inline-block' }} animate={{ y: keyState.down ? 2 : 0 }}>
                  <Icon name="arrow-down" />
                </motion.span>
              </motion.span>
              <span>to navigate</span>
            </div>

            <div className={styles.footerDivider} />

            <div className={styles.shortcut}>
              <span className={cx(styles.keyboardKey, styles.keyboardMultiKey)}>esc</span>
              <span>
                Close <strong>Launchpad</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(255, 255, 255, 0.10)',
      backdropFilter: 'blur(2px)',
    }),

    palette: css({
      height: '70vh',
      maxHeight: 650,
      width: '100%',
      maxWidth: 800,
      margin: '32px auto',
      overflow: 'hidden',
      borderRadius: 10,
      background: 'rgba(0, 0, 0, 0.80)',
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto',
      gridTemplateColumns: '1fr 1fr',
      backdropFilter: 'blur(20px)',
      boxShadow: [
        '0px 32px 32px -16px rgba(0, 0, 0, 0.15)',
        '0px 16px 16px -8px rgba(0, 0, 0, 0.15)',
        '0px 8px 8px -4px rgba(0, 0, 0, 0.15)',
        '0px 4px 4px -2px rgba(0, 0, 0, 0.15)',
        '0px 2px 2px -1px rgba(0, 0, 0, 0.15)',
        '0px 1px 1px 0px rgba(255, 255, 255, 0.10) inset',
      ].join(','),
      gridTemplateAreas: gt([
        // no prettier
        ['input', 'input'],
        ['main', 'main'],
        ['footer', 'footer'],
      ]),
    }),

    inputBarCell: css({
      padding: theme.spacing(3),
      gridArea: 'input',
      background: 'rgba(0, 0, 0, 0.40)',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: theme.spacing(2),
      backdropFilter: 'blur(2px)',
      alignItems: 'center',
    }),

    searchInput: css({
      all: 'unset',
    }),

    mainCell: css({
      padding: theme.spacing(1, 3),
      gridArea: 'main',
      overflow: 'auto',
      // background: 'green',
    }),

    detailCell: css({
      padding: 8,
      gridArea: 'detail',
      // background: 'yellow',
    }),

    footerCell: css({
      padding: theme.spacing(2, 3),
      gridArea: 'footer',
      background: '#16161E80',
      display: 'flex',
      gap: theme.spacing(2),
      backdropFilter: 'blur(2px)',
    }),

    footerDivider: css({
      height: '100%',
      width: 1,
      background: '#20202A',
    }),

    shortcut: css({
      display: 'flex',
      gap: 4,
    }),

    keyboardKey: css({
      display: 'inline-block',
      width: 24,
      height: 24,
      borderRadius: 6,
      border: `1px solid #20202A`,
      color: '#9D9DAD',
      background: 'black',
      textAlign: 'center',
      fontSize: 13,
    }),

    keyboardMultiKey: css({
      width: 'unset',
      padding: '0 8px',
    }),

    resultItem: css({
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: theme.spacing(2),
      alignItems: 'center',
      padding: theme.spacing(2, 0),
      color: '#9898A4',
      fontSize: 14,
    }),

    dividerItem: css({
      textTransform: 'uppercase',
      display: 'flex',
      gap: theme.spacing(3),
      alignItems: 'center',
      color: '#4F4F5D',
      fontWeight: 500,
      fontSize: 12,
    }),

    dividerDivider: css({
      height: 1,
      width: '100%',
      background: 'rgba(44, 44, 57, 0.40)',
      flex: 1,
    }),
  };
};

const gt = (gridDef: Array<string | string[]>) => {
  return gridDef
    .map((row) => {
      const rowString = typeof row === 'string' ? row : row.join(' ');
      return `"${rowString}"`;
    })
    .join('\n');
};
