import LoaderIcon from '@sourcegraph/icons/lib/Loader'
import upperFirst from 'lodash/upperFirst'
import * as React from 'react'
import { RouteComponentProps } from 'react-router'
import { Observable } from 'rxjs/Observable'
import { merge } from 'rxjs/observable/merge'
import { of } from 'rxjs/observable/of'
import { catchError } from 'rxjs/operators/catchError'
import { distinctUntilChanged } from 'rxjs/operators/distinctUntilChanged'
import { map } from 'rxjs/operators/map'
import { switchMap } from 'rxjs/operators/switchMap'
import { tap } from 'rxjs/operators/tap'
import { Subject } from 'rxjs/Subject'
import { Subscription } from 'rxjs/Subscription'
import { gql, queryGraphQL } from '../../backend/graphql'
import { FilteredConnection } from '../../components/FilteredConnection'
import { eventLogger } from '../../tracking/eventLogger'
import { asError, createAggregateError, ErrorLike, isErrorLike } from '../../util/errors'
import { memoizeObservable } from '../../util/memoize'
import { GitCommitNode } from '../commits/GitCommitNode'
import { gitCommitFragment } from '../commits/RepositoryCommitsPage'
import { FileDiffNode, FileDiffNodeProps } from '../compare/FileDiffNode'
import { queryRepositoryComparisonFileDiffs } from '../compare/RepositoryCompareDiffPage'

const queryCommit = memoizeObservable(
    (args: { repo: GQLID; revspec: string }): Observable<GQL.IGitCommit> =>
        queryGraphQL(
            gql`
                query RepositoryCommit($repo: ID!, $revspec: String!) {
                    node(id: $repo) {
                        ... on Repository {
                            commit(rev: $revspec) {
                                __typename # necessary so that isErrorLike(x) is false when x: GQL.IGitCommit
                                ...GitCommitFields
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
                if (!repo.commit) {
                    throw createAggregateError(errors)
                }
                return repo.commit
            })
        ),
    args => `${args.repo}:${args.revspec}`
)

interface Props extends RouteComponentProps<{ revspec: string }> {
    repo: GQL.IRepository

    onDidUpdateExternalLinks: (externalLinks: GQL.IExternalLink[] | undefined) => void
}

interface State {
    /** The commit, undefined while loading, or an error. */
    commitOrError?: GQL.IGitCommit | ErrorLike
}

class FilteredFileDiffConnection extends FilteredConnection<
    GQL.IFileDiff,
    Pick<FileDiffNodeProps, 'repoName' | 'base' | 'head' | 'lineNumbers' | 'className'>
> {}

/** Displays a commit. */
export class RepositoryCommitPage extends React.PureComponent<Props, State> {
    public state: State = {}

    private componentUpdates = new Subject<Props>()
    private subscriptions = new Subscription()

    public componentDidMount(): void {
        eventLogger.logViewEvent('RepositoryCommit')

        this.subscriptions.add(
            this.componentUpdates
                .pipe(
                    distinctUntilChanged(
                        (a, b) => a.repo.id === b.repo.id && a.match.params.revspec === b.match.params.revspec
                    ),
                    switchMap(({ repo, match }) =>
                        merge(
                            of({ commitOrError: undefined }),
                            queryCommit({ repo: repo.id, revspec: match.params.revspec }).pipe(
                                catchError(error => [asError(error)]),
                                map(c => ({ commitOrError: c })),
                                tap(({ commitOrError }: { commitOrError: GQL.IGitCommit | ErrorLike }) => {
                                    if (isErrorLike(commitOrError)) {
                                        this.props.onDidUpdateExternalLinks(undefined)
                                    } else {
                                        this.props.onDidUpdateExternalLinks(commitOrError.externalURLs)
                                    }
                                })
                            )
                        )
                    )
                )
                .subscribe(stateUpdate => this.setState(stateUpdate), error => console.error(error))
        )
        this.componentUpdates.next(this.props)
    }

    public componentWillUpdate(nextProps: Props): void {
        this.componentUpdates.next(nextProps)
    }

    public componentWillUnmount(): void {
        this.props.onDidUpdateExternalLinks(undefined)
        this.subscriptions.unsubscribe()
    }

    public render(): JSX.Element | null {
        return (
            <div className="repository-commit-page area">
                <div className="area__content">
                    {this.state.commitOrError === undefined ? (
                        <LoaderIcon className="icon-inline mt-2" />
                    ) : isErrorLike(this.state.commitOrError) ? (
                        <div className="alert alert-danger mt-2">
                            Error: {upperFirst(this.state.commitOrError.message)}
                        </div>
                    ) : (
                        <>
                            <div className="card repository-commit-page__card">
                                <div className="card-body">
                                    <GitCommitNode
                                        node={this.state.commitOrError}
                                        repoName={this.props.repo.uri}
                                        expandCommitMessageBody={true}
                                        showSHAAndParentsRow={true}
                                    />
                                </div>
                            </div>
                            <div className="mb-3" />
                            <FilteredFileDiffConnection
                                listClassName="list-group list-group-flush"
                                noun="changed file"
                                pluralNoun="changed files"
                                queryConnection={this.queryDiffs}
                                nodeComponent={FileDiffNode}
                                nodeComponentProps={{
                                    repoName: this.props.repo.uri,
                                    base: this.state.commitOrError.oid + '~',
                                    head: this.state.commitOrError.oid,
                                    lineNumbers: false,
                                }}
                                defaultFirst={25}
                                hideFilter={true}
                                noSummaryIfAllNodesVisible={true}
                                history={this.props.history}
                                location={this.props.location}
                            />
                        </>
                    )}
                </div>
            </div>
        )
    }

    private queryDiffs = (args: { first?: number }): Observable<GQL.IFileDiffConnection> =>
        queryRepositoryComparisonFileDiffs({
            ...args,
            repo: this.props.repo.id,
            base: (this.state.commitOrError as GQL.IGitCommit).oid + '~',
            head: (this.state.commitOrError as GQL.IGitCommit).oid,
        })
}
