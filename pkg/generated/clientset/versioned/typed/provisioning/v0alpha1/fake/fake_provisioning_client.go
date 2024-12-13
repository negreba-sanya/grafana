// SPDX-License-Identifier: AGPL-3.0-only

// Code generated by client-gen. DO NOT EDIT.

package fake

import (
	v0alpha1 "github.com/grafana/grafana/pkg/generated/clientset/versioned/typed/provisioning/v0alpha1"
	rest "k8s.io/client-go/rest"
	testing "k8s.io/client-go/testing"
)

type FakeProvisioningV0alpha1 struct {
	*testing.Fake
}

func (c *FakeProvisioningV0alpha1) Repositories(namespace string) v0alpha1.RepositoryInterface {
	return &FakeRepositories{c, namespace}
}

// RESTClient returns a RESTClient that is used to communicate
// with API server by this client implementation.
func (c *FakeProvisioningV0alpha1) RESTClient() rest.Interface {
	var ret *rest.RESTClient
	return ret
}
