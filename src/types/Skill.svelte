<script lang="ts">
import { t } from "@transifex/native";

import { getContext } from "svelte";

import { byName, CddaData, singular, singularName } from "../data";
import LimitedList from "../LimitedList.svelte";
import {
  isItemSubtype,
  type Skill,
  type SupportedTypesWithMapped,
  type Recipe as RecipeType,
} from "../types";
import ItemSymbol from "./item/ItemSymbol.svelte";
import ThingLink from "./ThingLink.svelte";
import Recipe from "./Recipe.svelte";
import ModTag from "./ModTag.svelte";

export let item: Skill;

const data = getContext<CddaData>("data");
const _context = "Skill";

const booksWithSkill = data
  .byType("item")
  .filter(
    (t) =>
      t.id && isItemSubtype("BOOK", t) && (t.read_skill ?? t.skill) === item.id,
  )
  .sort((a, b) =>
    singularName(a).localeCompare(singularName(b)),
  ) as SupportedTypesWithMapped["BOOK"][];

const booksByLevel = new Map<number, SupportedTypesWithMapped["BOOK"][]>();
for (const book of booksWithSkill) {
  if (!booksByLevel.has(book.max_level ?? 0))
    booksByLevel.set(book.max_level ?? 0, []);
  booksByLevel.get(book.max_level ?? 0)!.push(book);
}
const booksByLevelList = [...booksByLevel.entries()].sort(
  (a, b) => a[0] - b[0],
);
booksByLevelList.forEach(([, books]) => {
  books.sort((a, b) => (a.required_level ?? 0) - (b.required_level ?? 0));
});

const itemsUsingSkill = data
  .byType("item")
  .filter(
    (i) => i.id && isItemSubtype("GUN", i) && i.skill === item.id,
  ) as SupportedTypesWithMapped["GUN"][];
itemsUsingSkill.sort(byName);

const practiceRecipes = data
  .byType("practice")
  .filter((r) => r.skill_used === item.id);
practiceRecipes.sort(
  (a, b) =>
    (a.practice_data?.min_difficulty ?? 0) -
    (b.practice_data?.min_difficulty ?? 0),
);

const skillRecipes: (RecipeType & { result: string })[][] = [];
for (const recipe of data.byType("recipe")) {
  if (recipe.skill_used !== item.id) continue;
  if (recipe.abstract || recipe.obsolete || recipe.never_learn) continue;
  if (!recipe.result || !data.byIdMaybe("item", recipe.result)) continue;
  const level = recipe.difficulty ?? 0;
  skillRecipes[level] ??= [];
  skillRecipes[level].push(recipe as RecipeType & { result: string });
}
for (const level of skillRecipes) {
  if (!level) continue;
  level.sort((a, b) => {
    const aResult = data.byId("item", a.result!);
    const bResult = data.byId("item", b.result!);
    if (aResult !== bResult) {
      return singularName(aResult).localeCompare(singularName(bResult));
    }
    const aName = (a.name ? singularName(a) : "%s").replace(
      "%s",
      singularName(aResult),
    );
    const bName = (b.name ? singularName(b) : "%s").replace(
      "%s",
      singularName(bResult),
    );
    return aName.localeCompare(bName);
  });
}
</script>

<h1>{t("Skill")}: {singularName(item)} <ModTag {item} clickable /></h1>
<section>
  <p style="color: var(--cata-color-gray)">{singular(item.description)}</p>
</section>

{#if booksWithSkill.length}
  <section>
    <h1>{t("Books", { _context: "Skill" })}</h1>
    <dl>
      {#each booksByLevelList as [level, books]}
        <dt style="font-variant: tabular-nums">Level {level}</dt>
        <dd>
          <ul>
            {#each books as book}
              <li><ThingLink id={book.id} type="item" /></li>
            {/each}
          </ul>
        </dd>
      {/each}
    </dl>
  </section>
{/if}

{#if itemsUsingSkill.length}
  <section>
    <h1>{t("Used By", { _context: "Skill" })}</h1>
    <LimitedList items={itemsUsingSkill} let:item>
      <ItemSymbol {item} />
      <ThingLink type="item" id={item.id} />
    </LimitedList>
  </section>
{/if}

{#if practiceRecipes.length}
  <h1>{t("Practice Recipes", { _context: "Skill" })}</h1>
  {#each practiceRecipes as recipe}
    <Recipe {recipe} showResult={false} />
  {/each}
{/if}

{#if skillRecipes.length}
  <h1>{t("Recipes")}</h1>
  {#each skillRecipes as recipes, level}
    {#if recipes && recipes.length}
      <section>
        <h1>{t("Level {level}", { level, _context })}</h1>
        <LimitedList items={recipes} let:item>
          <ThingLink id={item.result} type="item" />
        </LimitedList>
      </section>
    {/if}
  {/each}
{/if}
