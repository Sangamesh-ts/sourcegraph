import { type FC, useLayoutEffect, useRef, useState } from 'react'

import { type Location, useLocation } from 'react-router-dom'
import { BehaviorSubject } from 'rxjs'
import { first } from 'rxjs/operators'

import type { PlatformContext } from '@sourcegraph/shared/src/platform/context'
import { isSearchContextSpecAvailable } from '@sourcegraph/shared/src/search'

import { getQueryStateFromLocation } from './search'
import { setQueryStateFromURL } from './stores/navbarSearchQueryState'

export const GLOBAL_SEARCH_CONTEXT_SPEC = 'global'

interface SearchQueryStateObserverProps {
    searchContextsEnabled: boolean
    platformContext: PlatformContext
    selectedSearchContextSpec?: string
    setSelectedSearchContextSpec: (spec: string) => void
}

// Update search query state whenever the URL changes
export const SearchQueryStateObserver: FC<SearchQueryStateObserverProps> = props => {
    const { searchContextsEnabled, platformContext, setSelectedSearchContextSpec, selectedSearchContextSpec } = props

    const location = useLocation()

    const selectedSearchContextSpecRef = useRef(selectedSearchContextSpec)
    selectedSearchContextSpecRef.current = selectedSearchContextSpec

    // Create `locationSubject` once on mount. New values are provided in the `useEffect` hook.

    const [locationSubject] = useState(() => new BehaviorSubject<Location>(location))

    useLayoutEffect(() => {
        locationSubject.next(location)
    }, [location, locationSubject])

    useLayoutEffect(() => {
        const subscription = getQueryStateFromLocation({
            location: locationSubject,
            isSearchContextAvailable: (searchContext: string) =>
                searchContextsEnabled
                    ? isSearchContextSpecAvailable({
                          spec: searchContext,
                          platformContext,
                      })
                          .pipe(first())
                          .toPromise()
                    : Promise.resolve(false),
        }).subscribe(parsedSearchURLAndContext => {
            if (parsedSearchURLAndContext.query) {
                // Only override filters and update query from URL if there
                // is a search query.
                if (!parsedSearchURLAndContext.searchContextSpec) {
                    // If no search context is present we have to fall back
                    // to the global search context to match the server
                    // behavior.
                    setSelectedSearchContextSpec(GLOBAL_SEARCH_CONTEXT_SPEC)
                } else if (parsedSearchURLAndContext.searchContextSpec.spec !== selectedSearchContextSpecRef.current) {
                    setSelectedSearchContextSpec(parsedSearchURLAndContext.searchContextSpec.spec)
                }

                setQueryStateFromURL(parsedSearchURLAndContext, parsedSearchURLAndContext.query)
            }
        })

        return () => subscription.unsubscribe()
    }, [
        locationSubject,
        platformContext,
        searchContextsEnabled,
        selectedSearchContextSpecRef,
        setSelectedSearchContextSpec,
    ])

    return null
}
