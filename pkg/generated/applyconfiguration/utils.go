// SPDX-License-Identifier: AGPL-3.0-only

// Code generated by applyconfiguration-gen. DO NOT EDIT.

package applyconfiguration

import (
	v0alpha1 "github.com/grafana/grafana/pkg/apis/provisioning/v0alpha1"
	servicev0alpha1 "github.com/grafana/grafana/pkg/apis/service/v0alpha1"
	internal "github.com/grafana/grafana/pkg/generated/applyconfiguration/internal"
	provisioningv0alpha1 "github.com/grafana/grafana/pkg/generated/applyconfiguration/provisioning/v0alpha1"
	applyconfigurationservicev0alpha1 "github.com/grafana/grafana/pkg/generated/applyconfiguration/service/v0alpha1"
	runtime "k8s.io/apimachinery/pkg/runtime"
	schema "k8s.io/apimachinery/pkg/runtime/schema"
	testing "k8s.io/client-go/testing"
)

// ForKind returns an apply configuration type for the given GroupVersionKind, or nil if no
// apply configuration type exists for the given GroupVersionKind.
func ForKind(kind schema.GroupVersionKind) interface{} {
	switch kind {
	// Group=provisioning.grafana.app, Version=v0alpha1
	case v0alpha1.SchemeGroupVersion.WithKind("EditingOptions"):
		return &provisioningv0alpha1.EditingOptionsApplyConfiguration{}
	case v0alpha1.SchemeGroupVersion.WithKind("GitHubRepositoryConfig"):
		return &provisioningv0alpha1.GitHubRepositoryConfigApplyConfiguration{}
	case v0alpha1.SchemeGroupVersion.WithKind("HealthStatus"):
		return &provisioningv0alpha1.HealthStatusApplyConfiguration{}
	case v0alpha1.SchemeGroupVersion.WithKind("LocalRepositoryConfig"):
		return &provisioningv0alpha1.LocalRepositoryConfigApplyConfiguration{}
	case v0alpha1.SchemeGroupVersion.WithKind("Repository"):
		return &provisioningv0alpha1.RepositoryApplyConfiguration{}
	case v0alpha1.SchemeGroupVersion.WithKind("RepositorySpec"):
		return &provisioningv0alpha1.RepositorySpecApplyConfiguration{}
	case v0alpha1.SchemeGroupVersion.WithKind("RepositoryStatus"):
		return &provisioningv0alpha1.RepositoryStatusApplyConfiguration{}
	case v0alpha1.SchemeGroupVersion.WithKind("S3RepositoryConfig"):
		return &provisioningv0alpha1.S3RepositoryConfigApplyConfiguration{}
	case v0alpha1.SchemeGroupVersion.WithKind("SyncStatus"):
		return &provisioningv0alpha1.SyncStatusApplyConfiguration{}

		// Group=service.grafana.app, Version=v0alpha1
	case servicev0alpha1.SchemeGroupVersion.WithKind("ExternalName"):
		return &applyconfigurationservicev0alpha1.ExternalNameApplyConfiguration{}
	case servicev0alpha1.SchemeGroupVersion.WithKind("ExternalNameSpec"):
		return &applyconfigurationservicev0alpha1.ExternalNameSpecApplyConfiguration{}

	}
	return nil
}

func NewTypeConverter(scheme *runtime.Scheme) *testing.TypeConverter {
	return &testing.TypeConverter{Scheme: scheme, TypeResolver: internal.Parser()}
}
