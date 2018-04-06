import * as H from 'history'
import * as React from 'react'
import { Observable } from 'rxjs/Observable'
import { map } from 'rxjs/operators/map'
import { gql, queryGraphQL } from '../../backend/graphql'
import { FilteredConnection, FilteredConnectionQueryArgs } from '../../components/FilteredConnection'
import { DismissibleAlert } from '../../site/DismissibleAlert'
import { eventLogger } from '../../tracking/eventLogger'
import { createAggregateError } from '../../util/errors'
import { RepoHeaderActionPortal } from '../RepoHeaderActionPortal'
import { RepoHeaderBreadcrumbNavItem } from '../RepoHeaderBreadcrumbNavItem'
import { GitCommitNode, GitCommitNodeProps } from './GitCommitNode'

export const gitCommitFragment = gql`
    fragment GitCommitFields on GitCommit {
        id
        oid
        abbreviatedOID
        message
        subject
        body
        author {
            ...SignatureFields
        }
        committer {
            ...SignatureFields
        }
        parents {
            oid
            abbreviatedOID
        }
        url
        externalURLs {
            url
            serviceType
        }
    }

    fragment SignatureFields on Signature {
        person {
            avatarURL
            name
            email
            displayName
        }
        date
    }
`

const fetchGitCommits = (args: {
    repo: GQLID
    revspec: string
    first?: number
    query?: string
}): Observable<GQL.IGitCommitConnection> =>
    queryGraphQL(
        gql`
            query RepositoryGitCommits($repo: ID!, $revspec: String!, $first: Int, $query: String) {
                node(id: $repo) {
                    ... on Repository {
                        commit(rev: $revspec) {
                            ancestors(first: $first, query: $query) {
                                nodes {
                                    ...GitCommitFields
                                }
                                pageInfo {
                                    hasNextPage
                                }
                            }
                        }
                    }
                }
            }
            ${gitCommitFragment}
        `,
        args
    ).pipe(
        map(({ data, errors }) => {
            if (!data || !data.node) {
                throw createAggregateError(errors)
            }
            const repo = data.node as GQL.IRepository
            if (!repo.commit || !repo.commit.ancestors) {
                throw createAggregateError(errors)
            }
            return repo.commit.ancestors
        })
    )

interface Props {
    repo: GQL.IRepository
    rev?: string
    commitID: string

    history: H.History
    location: H.Location
}

export class FilteredGitCommitConnection extends FilteredConnection<
    GQL.IGitCommit,
    Pick<GitCommitNodeProps, 'repoName' | 'className' | 'compact'>
> {}

/** A page that shows a repository's commits at the current revision. */
export class RepositoryCommitsPage extends React.PureComponent<Props> {
    public componentDidMount(): void {
        eventLogger.logViewEvent('RepositoryCommits')
    }

    public render(): JSX.Element | null {
        return (
            <div className="repository-commits-page">
                <DismissibleAlert className="alert-warning mb-1" partialStorageKey="repository-commits-experimental">
                    <span>
                        The repository commits list is an <strong>experimental</strong> feature.
                    </span>
                </DismissibleAlert>
                <RepoHeaderActionPortal
                    position="nav"
                    element={<RepoHeaderBreadcrumbNavItem key="commits">Commits</RepoHeaderBreadcrumbNavItem>}
                />
                <FilteredGitCommitConnection
                    className="repository-commits-page__content"
                    listClassName="list-group list-group-flush"
                    noun="commit"
                    pluralNoun="commits"
                    queryConnection={this.queryCommits}
                    nodeComponent={GitCommitNode}
                    nodeComponentProps={{ repoName: this.props.repo.uri, className: 'list-group-item' }}
                    defaultFirst={20}
                    autoFocus={true}
                    history={this.props.history}
                    hideFilter={true}
                    location={this.props.location}
                />
            </div>
        )
    }

    private queryCommits = (args: FilteredConnectionQueryArgs) =>
        fetchGitCommits({ ...args, repo: this.props.repo.id, revspec: this.props.commitID })
}
