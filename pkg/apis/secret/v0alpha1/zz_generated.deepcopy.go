//go:build !ignore_autogenerated
// +build !ignore_autogenerated

// SPDX-License-Identifier: AGPL-3.0-only

// Code generated by deepcopy-gen. DO NOT EDIT.

package v0alpha1

import (
	runtime "k8s.io/apimachinery/pkg/runtime"
)

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *AWSCredentials) DeepCopyInto(out *AWSCredentials) {
	*out = *in
	out.AccessKeyID = in.AccessKeyID
	out.SecretAccessKey = in.SecretAccessKey
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new AWSCredentials.
func (in *AWSCredentials) DeepCopy() *AWSCredentials {
	if in == nil {
		return nil
	}
	out := new(AWSCredentials)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *AWSKeeper) DeepCopyInto(out *AWSKeeper) {
	*out = *in
	out.AWSCredentials = in.AWSCredentials
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new AWSKeeper.
func (in *AWSKeeper) DeepCopy() *AWSKeeper {
	if in == nil {
		return nil
	}
	out := new(AWSKeeper)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *AzureCredentials) DeepCopyInto(out *AzureCredentials) {
	*out = *in
	out.ClientSecret = in.ClientSecret
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new AzureCredentials.
func (in *AzureCredentials) DeepCopy() *AzureCredentials {
	if in == nil {
		return nil
	}
	out := new(AzureCredentials)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *AzureKeeper) DeepCopyInto(out *AzureKeeper) {
	*out = *in
	out.AzureCredentials = in.AzureCredentials
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new AzureKeeper.
func (in *AzureKeeper) DeepCopy() *AzureKeeper {
	if in == nil {
		return nil
	}
	out := new(AzureKeeper)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *CredentialValue) DeepCopyInto(out *CredentialValue) {
	*out = *in
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new CredentialValue.
func (in *CredentialValue) DeepCopy() *CredentialValue {
	if in == nil {
		return nil
	}
	out := new(CredentialValue)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *Encryption) DeepCopyInto(out *Encryption) {
	*out = *in
	if in.Envelope != nil {
		in, out := &in.Envelope, &out.Envelope
		*out = new(Envelope)
		**out = **in
	}
	if in.AWS != nil {
		in, out := &in.AWS, &out.AWS
		*out = new(AWSCredentials)
		**out = **in
	}
	if in.Azure != nil {
		in, out := &in.Azure, &out.Azure
		*out = new(AzureCredentials)
		**out = **in
	}
	if in.GCP != nil {
		in, out := &in.GCP, &out.GCP
		*out = new(GCPCredentials)
		**out = **in
	}
	if in.HashiCorp != nil {
		in, out := &in.HashiCorp, &out.HashiCorp
		*out = new(HashiCorpCredentials)
		**out = **in
	}
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new Encryption.
func (in *Encryption) DeepCopy() *Encryption {
	if in == nil {
		return nil
	}
	out := new(Encryption)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *Envelope) DeepCopyInto(out *Envelope) {
	*out = *in
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new Envelope.
func (in *Envelope) DeepCopy() *Envelope {
	if in == nil {
		return nil
	}
	out := new(Envelope)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *GCPCredentials) DeepCopyInto(out *GCPCredentials) {
	*out = *in
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new GCPCredentials.
func (in *GCPCredentials) DeepCopy() *GCPCredentials {
	if in == nil {
		return nil
	}
	out := new(GCPCredentials)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *GCPKeeper) DeepCopyInto(out *GCPKeeper) {
	*out = *in
	out.GCPCredentials = in.GCPCredentials
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new GCPKeeper.
func (in *GCPKeeper) DeepCopy() *GCPKeeper {
	if in == nil {
		return nil
	}
	out := new(GCPKeeper)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *HashiCorpCredentials) DeepCopyInto(out *HashiCorpCredentials) {
	*out = *in
	out.Token = in.Token
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new HashiCorpCredentials.
func (in *HashiCorpCredentials) DeepCopy() *HashiCorpCredentials {
	if in == nil {
		return nil
	}
	out := new(HashiCorpCredentials)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *HashiCorpKeeper) DeepCopyInto(out *HashiCorpKeeper) {
	*out = *in
	out.HashiCorpCredentials = in.HashiCorpCredentials
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new HashiCorpKeeper.
func (in *HashiCorpKeeper) DeepCopy() *HashiCorpKeeper {
	if in == nil {
		return nil
	}
	out := new(HashiCorpKeeper)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *Keeper) DeepCopyInto(out *Keeper) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	in.Spec.DeepCopyInto(&out.Spec)
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new Keeper.
func (in *Keeper) DeepCopy() *Keeper {
	if in == nil {
		return nil
	}
	out := new(Keeper)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *Keeper) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *KeeperList) DeepCopyInto(out *KeeperList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]Keeper, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new KeeperList.
func (in *KeeperList) DeepCopy() *KeeperList {
	if in == nil {
		return nil
	}
	out := new(KeeperList)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *KeeperList) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *KeeperSpec) DeepCopyInto(out *KeeperSpec) {
	*out = *in
	if in.SQL != nil {
		in, out := &in.SQL, &out.SQL
		*out = new(SQLKeeper)
		(*in).DeepCopyInto(*out)
	}
	if in.AWS != nil {
		in, out := &in.AWS, &out.AWS
		*out = new(AWSKeeper)
		**out = **in
	}
	if in.Azure != nil {
		in, out := &in.Azure, &out.Azure
		*out = new(AzureKeeper)
		**out = **in
	}
	if in.GCP != nil {
		in, out := &in.GCP, &out.GCP
		*out = new(GCPKeeper)
		**out = **in
	}
	if in.HashiCorp != nil {
		in, out := &in.HashiCorp, &out.HashiCorp
		*out = new(HashiCorpKeeper)
		**out = **in
	}
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new KeeperSpec.
func (in *KeeperSpec) DeepCopy() *KeeperSpec {
	if in == nil {
		return nil
	}
	out := new(KeeperSpec)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *SQLKeeper) DeepCopyInto(out *SQLKeeper) {
	*out = *in
	if in.Encryption != nil {
		in, out := &in.Encryption, &out.Encryption
		*out = new(Encryption)
		(*in).DeepCopyInto(*out)
	}
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new SQLKeeper.
func (in *SQLKeeper) DeepCopy() *SQLKeeper {
	if in == nil {
		return nil
	}
	out := new(SQLKeeper)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *SecureValue) DeepCopyInto(out *SecureValue) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	in.Spec.DeepCopyInto(&out.Spec)
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new SecureValue.
func (in *SecureValue) DeepCopy() *SecureValue {
	if in == nil {
		return nil
	}
	out := new(SecureValue)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *SecureValue) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *SecureValueList) DeepCopyInto(out *SecureValueList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]SecureValue, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new SecureValueList.
func (in *SecureValueList) DeepCopy() *SecureValueList {
	if in == nil {
		return nil
	}
	out := new(SecureValueList)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyObject is an autogenerated deepcopy function, copying the receiver, creating a new runtime.Object.
func (in *SecureValueList) DeepCopyObject() runtime.Object {
	if c := in.DeepCopy(); c != nil {
		return c
	}
	return nil
}

// DeepCopyInto is an autogenerated deepcopy function, copying the receiver, writing into out. in must be non-nil.
func (in *SecureValueSpec) DeepCopyInto(out *SecureValueSpec) {
	*out = *in
	if in.Audiences != nil {
		in, out := &in.Audiences, &out.Audiences
		*out = make([]string, len(*in))
		copy(*out, *in)
	}
	return
}

// DeepCopy is an autogenerated deepcopy function, copying the receiver, creating a new SecureValueSpec.
func (in *SecureValueSpec) DeepCopy() *SecureValueSpec {
	if in == nil {
		return nil
	}
	out := new(SecureValueSpec)
	in.DeepCopyInto(out)
	return out
}
