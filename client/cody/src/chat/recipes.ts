import { ChatQuestion } from '@sourcegraph/cody-shared/src/chat/recipes/chat-question'
import { ContextSearch } from '@sourcegraph/cody-shared/src/chat/recipes/context-search'
import { ExplainCodeDetailed } from '@sourcegraph/cody-shared/src/chat/recipes/explain-code-detailed'
import { ExplainCodeHighLevel } from '@sourcegraph/cody-shared/src/chat/recipes/explain-code-high-level'
import { FindCodeSmells } from '@sourcegraph/cody-shared/src/chat/recipes/find-code-smells'
import { Fixup } from '@sourcegraph/cody-shared/src/chat/recipes/fixup'
import { GenerateDocstring } from '@sourcegraph/cody-shared/src/chat/recipes/generate-docstring'
import { ReleaseNotes } from '@sourcegraph/cody-shared/src/chat/recipes/generate-release-notes'
import { GenerateTest } from '@sourcegraph/cody-shared/src/chat/recipes/generate-test'
import { GitHistory } from '@sourcegraph/cody-shared/src/chat/recipes/git-log'
import { ImproveVariableNames } from '@sourcegraph/cody-shared/src/chat/recipes/improve-variable-names'
import { InlineChat } from '@sourcegraph/cody-shared/src/chat/recipes/inline-chat'
import { NextQuestions } from '@sourcegraph/cody-shared/src/chat/recipes/next-questions'
import { Recipe, RecipeID } from '@sourcegraph/cody-shared/src/chat/recipes/recipe'
import { TranslateToLanguage } from '@sourcegraph/cody-shared/src/chat/recipes/translate'

import { debug } from '../log'

const registeredRecipes: { [id in RecipeID]?: Recipe } = {}

export function getRecipe(id: RecipeID): Recipe | undefined {
    return registeredRecipes[id]
}

function registerRecipe(id: RecipeID, recipe: Recipe): void {
    registeredRecipes[id] = recipe
}

function init(): void {
    if (Object.keys(registeredRecipes).length > 0) {
        return
    }

    const recipes: Recipe[] = [
        new ChatQuestion(debug),
        new ExplainCodeDetailed(),
        new ExplainCodeHighLevel(),
        new InlineChat(),
        new GenerateDocstring(),
        new GenerateTest(),
        new GitHistory(),
        new ImproveVariableNames(),
        new Fixup(),
        new TranslateToLanguage(),
        new FindCodeSmells(),
        new NextQuestions(),
        new ContextSearch(),
        new ReleaseNotes(),
    ]

    for (const recipe of recipes) {
        const existingRecipe = getRecipe(recipe.id)
        if (existingRecipe) {
            throw new Error(`Duplicate recipe with ID ${recipe.id}`)
        }
        registerRecipe(recipe.id, recipe)
    }
}

init()
