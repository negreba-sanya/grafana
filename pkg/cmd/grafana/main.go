package main

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/urfave/cli/v2"

	gcli "github.com/grafana/grafana/pkg/cmd/grafana-cli/commands"
	gsrv "github.com/grafana/grafana/pkg/cmd/grafana-server/commands"
)

// The following variables cannot be constants, since they can be overridden through the -X link flag
var version = "9.2.0"
var commit = gcli.DefaultCommitValue
var enterpriseCommit = gcli.DefaultCommitValue
var buildBranch = "main"
var buildstamp string

// Extra commands may be added from enterprise
var extra = []*cli.Command{}

func main() {
	commands := []*cli.Command{
		gcli.CLICommand(version),
		gsrv.ServerCommand(version, commit, enterpriseCommit, buildBranch, buildstamp),
	}
	commands = append(commands, extra...)

	app := &cli.App{
		Name:  "grafana",
		Usage: "Grafana server and command line interface",
		Authors: []*cli.Author{
			{
				Name:  "Grafana Project",
				Email: "hello@grafana.com",
			},
		},
		Version:              version,
		Commands:             commands,
		CommandNotFound:      cmdNotFound,
		EnableBashCompletion: true,
	}

	if err := app.Run(os.Args); err != nil {
		fmt.Printf("%s: %s %s\n", color.RedString("Error"), color.RedString("✗"), err)
		os.Exit(1)
	}

	os.Exit(0)
}

func cmdNotFound(c *cli.Context, command string) {
	fmt.Printf(
		"%s: '%s' is not a %s command. See '%s --help'.\n",
		c.App.Name,
		command,
		c.App.Name,
		os.Args[0],
	)
	os.Exit(1)
}
