package cody

import (
	"context"

	"github.com/sourcegraph/log"

	"github.com/sourcegraph/sourcegraph/cmd/frontend/backend"
	"github.com/sourcegraph/sourcegraph/cmd/frontend/envvar"
	"github.com/sourcegraph/sourcegraph/internal/actor"
	"github.com/sourcegraph/sourcegraph/internal/auth"
	"github.com/sourcegraph/sourcegraph/internal/conf"
	"github.com/sourcegraph/sourcegraph/internal/database"
	"github.com/sourcegraph/sourcegraph/internal/featureflag"
	"github.com/sourcegraph/sourcegraph/lib/errors"
)

// IsCodyEnabled determines if cody is enabled for the actor in the given context.
// If it is an unauthenticated request, cody is disabled.
// If Completions aren't configured, cody is disabled.
// If Completions are not enabled, cody is disabled
// If CodyRestrictUsersFeatureFlag is set, the cody-experimental featureflag
// will determine access.
// Otherwise, all authenticated users are granted access.
func IsCodyEnabled(ctx context.Context) bool {
	a := actor.FromContext(ctx)
	if !a.IsAuthenticated() {
		return false
	}
	completionsConfig := conf.Get().Completions
	if completionsConfig == nil {
		return false
	}

	if !completionsConfig.Enabled {
		return false
	}

	experimentalFeatures := conf.Get().ExperimentalFeatures
	if experimentalFeatures != nil && experimentalFeatures.CodyRestrictUsersFeatureFlag {
		return featureflag.FromContext(ctx).GetBoolOr("cody-experimental", false)
	}
	return true
}

var ErrRequiresVerifiedEmailAddress = errors.New("cody requires a verified email address")

func CheckVerifiedEmailRequirement(ctx context.Context, db database.DB, logger log.Logger) error {
	// Only check on dotcom
	if !envvar.SourcegraphDotComMode() {
		return nil
	}

	// Do not require if user is site-admin
	if err := auth.CheckCurrentUserIsSiteAdmin(ctx, db); err == nil {
		return nil
	}

	verified, err := backend.NewUserEmailsService(db, logger).CurrentActorHasVerifiedEmail(ctx)
	if err != nil {
		return err
	}
	if verified {
		return nil
	}

	return ErrRequiresVerifiedEmailAddress
}
