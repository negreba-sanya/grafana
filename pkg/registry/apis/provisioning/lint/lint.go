package lint

import (
	"context"

	provisioning "github.com/grafana/grafana/pkg/apis/provisioning/v0alpha1"
)

type Linter interface {
	Lint(ctx context.Context, data []byte) ([]provisioning.LintIssue, error)
}
