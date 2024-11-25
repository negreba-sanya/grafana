// Code generated by mockery v2.49.0. DO NOT EDIT.

package github

import (
	context "context"

	mock "github.com/stretchr/testify/mock"
)

// MockClient is an autogenerated mock type for the Client type
type MockClient struct {
	mock.Mock
}

// CreateFile provides a mock function with given fields: ctx, owner, repository, path, branch, message, content
func (_m *MockClient) CreateFile(ctx context.Context, owner string, repository string, path string, branch string, message string, content []byte) error {
	ret := _m.Called(ctx, owner, repository, path, branch, message, content)

	if len(ret) == 0 {
		panic("no return value specified for CreateFile")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, string, string, []byte) error); ok {
		r0 = rf(ctx, owner, repository, path, branch, message, content)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// CreateWebhook provides a mock function with given fields: ctx, owner, repository, cfg
func (_m *MockClient) CreateWebhook(ctx context.Context, owner string, repository string, cfg WebhookConfig) error {
	ret := _m.Called(ctx, owner, repository, cfg)

	if len(ret) == 0 {
		panic("no return value specified for CreateWebhook")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, WebhookConfig) error); ok {
		r0 = rf(ctx, owner, repository, cfg)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteFile provides a mock function with given fields: ctx, owner, repository, path, branch, message, hash
func (_m *MockClient) DeleteFile(ctx context.Context, owner string, repository string, path string, branch string, message string, hash string) error {
	ret := _m.Called(ctx, owner, repository, path, branch, message, hash)

	if len(ret) == 0 {
		panic("no return value specified for DeleteFile")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, string, string, string) error); ok {
		r0 = rf(ctx, owner, repository, path, branch, message, hash)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteWebhook provides a mock function with given fields: ctx, owner, repository, webhookID
func (_m *MockClient) DeleteWebhook(ctx context.Context, owner string, repository string, webhookID int64) error {
	ret := _m.Called(ctx, owner, repository, webhookID)

	if len(ret) == 0 {
		panic("no return value specified for DeleteWebhook")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, int64) error); ok {
		r0 = rf(ctx, owner, repository, webhookID)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// EditWebhook provides a mock function with given fields: ctx, owner, repository, cfg
func (_m *MockClient) EditWebhook(ctx context.Context, owner string, repository string, cfg WebhookConfig) error {
	ret := _m.Called(ctx, owner, repository, cfg)

	if len(ret) == 0 {
		panic("no return value specified for EditWebhook")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, WebhookConfig) error); ok {
		r0 = rf(ctx, owner, repository, cfg)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// GetContents provides a mock function with given fields: ctx, owner, repository, path, ref
func (_m *MockClient) GetContents(ctx context.Context, owner string, repository string, path string, ref string) (RepositoryContent, []RepositoryContent, error) {
	ret := _m.Called(ctx, owner, repository, path, ref)

	if len(ret) == 0 {
		panic("no return value specified for GetContents")
	}

	var r0 RepositoryContent
	var r1 []RepositoryContent
	var r2 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, string) (RepositoryContent, []RepositoryContent, error)); ok {
		return rf(ctx, owner, repository, path, ref)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, string) RepositoryContent); ok {
		r0 = rf(ctx, owner, repository, path, ref)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(RepositoryContent)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string, string, string) []RepositoryContent); ok {
		r1 = rf(ctx, owner, repository, path, ref)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).([]RepositoryContent)
		}
	}

	if rf, ok := ret.Get(2).(func(context.Context, string, string, string, string) error); ok {
		r2 = rf(ctx, owner, repository, path, ref)
	} else {
		r2 = ret.Error(2)
	}

	return r0, r1, r2
}

// ListWebhooks provides a mock function with given fields: ctx, owner, repository
func (_m *MockClient) ListWebhooks(ctx context.Context, owner string, repository string) ([]WebhookConfig, error) {
	ret := _m.Called(ctx, owner, repository)

	if len(ret) == 0 {
		panic("no return value specified for ListWebhooks")
	}

	var r0 []WebhookConfig
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string) ([]WebhookConfig, error)); ok {
		return rf(ctx, owner, repository)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string) []WebhookConfig); ok {
		r0 = rf(ctx, owner, repository)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]WebhookConfig)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string, string) error); ok {
		r1 = rf(ctx, owner, repository)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateFile provides a mock function with given fields: ctx, owner, repository, path, branch, message, hash, content
func (_m *MockClient) UpdateFile(ctx context.Context, owner string, repository string, path string, branch string, message string, hash string, content []byte) error {
	ret := _m.Called(ctx, owner, repository, path, branch, message, hash, content)

	if len(ret) == 0 {
		panic("no return value specified for UpdateFile")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, string, string, string, []byte) error); ok {
		r0 = rf(ctx, owner, repository, path, branch, message, hash, content)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// NewMockClient creates a new instance of MockClient. It also registers a testing interface on the mock and a cleanup function to assert the mocks expectations.
// The first argument is typically a *testing.T value.
func NewMockClient(t interface {
	mock.TestingT
	Cleanup(func())
}) *MockClient {
	mock := &MockClient{}
	mock.Mock.Test(t)

	t.Cleanup(func() { mock.AssertExpectations(t) })

	return mock
}
