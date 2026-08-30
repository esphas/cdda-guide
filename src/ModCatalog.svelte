<script lang="ts">
import { setContext } from "svelte";
import { t } from "@transifex/native";
import { CddaData, getAllObjectSources, i18n, mapType } from "./data";
import type { SupportedTypeMapped, SupportedTypesWithMapped } from "./types";
import CatalogSection from "./CatalogSection.svelte";
import JsonView from "./JsonView.svelte";

export let data: CddaData;
export let enabledMods: string[];
export let setModEnabled: (mod: string, enabled: boolean) => void;
export let modId: string | undefined = undefined;

function toggleMod(mod: string) {
  return (event: Event) => {
    const input = event.target as HTMLInputElement;
    setModEnabled(mod, input.checked);
  };
}

const reportedTypes = {
  item: t("Items"),
  monster: t("Monsters"),
  furniture: t("Furniture"),
  terrain: t("Terrain"),
  vehicle: t("Vehicles"),
  vehicle_part: t("Vehicle Parts"),
  tool_quality: t("Tool Qualities"),
  mutation: t("Mutations"),
  martial_art: t("Martial Arts"),
  json_flag: t("Flags"),
  achievement: t("Achievements"),
  conduct: t("Conducts"),
  proficiency: t("Proficiencies"),
} satisfies Partial<Record<keyof SupportedTypesWithMapped, string>>;

const reportedTypeEntries = Object.entries(reportedTypes) as [
  keyof typeof reportedTypes,
  string,
][];

const modCategoryNames = new Map<string, string>([
  ["total_conversion", "TOTAL CONVERSIONS"],
  ["content", "CORE CONTENT PACKS"],
  ["items", "ITEM ADDITION MODS"],
  ["creatures", "CREATURE MODS"],
  ["misc_additions", "MISC ADDITIONS"],
  ["buildings", "BUILDINGS MODS"],
  ["vehicles", "VEHICLE MODS"],
  ["rebalance", "REBALANCING MODS"],
  ["magical", "MAGICAL MODS"],
  ["item_exclude", "ITEM EXCLUSION MODS"],
  ["monster_exclude", "MONSTER EXCLUSION MODS"],
  ["graphical", "GRAPHICAL MODS"],
  ["accessibility", "ACCESSIBILITY MODS"],
  ["", "NO CATEGORY"],
]);

function groupModsByCategory(mods: typeof data.availableMods) {
  const groups = new Map<string, typeof mods>();
  for (const mod of mods) {
    const category = mod.category ?? "";
    groups.set(category, [...(groups.get(category) ?? []), mod]);
  }
  return [...groups.entries()].sort(([categoryA], [categoryB]) => {
    const orderA = [...modCategoryNames.keys()].indexOf(categoryA);
    const orderB = [...modCategoryNames.keys()].indexOf(categoryB);
    if (orderA === -1 && orderB === -1)
      return categoryA.localeCompare(categoryB);
    if (orderA === -1) return 1;
    if (orderB === -1) return -1;
    return orderA - orderB;
  });
}

function modCategoryName(category: string) {
  return i18n.__(modCategoryNames.get(category) ?? category);
}

function catalogItems(
  mod: string,
  type: keyof SupportedTypesWithMapped,
): (SupportedTypeMapped & { id: string })[] {
  return data
    .byType(type)
    .filter(
      (item): item is SupportedTypeMapped & { id: string } =>
        "id" in item &&
        typeof item.id === "string" &&
        getAllObjectSources(item).some((source) => source.__mod === mod),
    );
}

function knownConflicts(conflicts: string[] | undefined) {
  return (conflicts ?? []).flatMap((id) => {
    const mod = data.availableMods.find((candidate) => candidate.id === id);
    return mod ? [{ id, label: mod.label }] : [];
  });
}

function conflictingEnabledMods(
  modId: string,
  conflicts: string[] | undefined,
) {
  return enabledMods.flatMap((enabledModId) => {
    if (enabledModId === modId) return [];
    const enabledModInfo = data.getModInfo(enabledModId);
    const conflictsInEitherDirection =
      conflicts?.includes(enabledModId) ||
      enabledModInfo?.conflicts?.includes(modId);
    const enabledMod = data.availableMods.find(
      (candidate) => candidate.id === enabledModId,
    );
    return conflictsInEitherDirection && enabledMod
      ? [{ id: enabledModId, label: enabledMod.label }]
      : [];
  });
}

const hiddenMods = new Set([
  // These mods don't affect the data in the Guide at all, so hide them.
  "cbm_slots",
  "no_npc_food",
  "personal_portal_storms",
  "standard_combat_test",
  "stats_through_kills",
  "translate_dialogue",

  // MA isn't properly supported; we'd need to load all the map data and rework loot calcs to do it right.
  "MA",

  // This should probably be available, but it throws errors right now.
  "alt_map_key",
]);

$: displayedMods = data.availableMods.filter(
  (mod) => !hiddenMods.has(mod.id) && (!modId || mod.id === modId),
);
$: displayedModGroups = groupModsByCategory(displayedMods);

setContext("data", data);
</script>

{#if !modId}
  <h1>{t("Mods")}</h1>
  {#if displayedMods.length}
    {#each displayedModGroups as [category, mods]}
      <section>
        <h1>{modCategoryName(category)}</h1>
        <ul>
          {#each mods as mod}
            <li>
              <a
                href="{import.meta.env.BASE_URL}mod/{encodeURIComponent(
                  mod.id,
                )}{location.search}">{mod.label}</a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  {:else}
    <p>{t("No mods found.")}</p>
  {/if}
{:else}
  {#each displayedMods as mod (mod.id)}
    {@const modData = data.getRawModData(mod.id)}
    {@const modInfo = data.getModInfo(mod.id)}
    {@const conflicts = knownConflicts(modInfo?.conflicts)}
    {@const enabledConflicts = conflictingEnabledMods(
      mod.id,
      modInfo?.conflicts,
    )}
    {@const countByType = modData.reduce((acc, item) => {
      const mappedType = mapType(item.type);
      if (mappedType in reportedTypes)
        acc[mappedType] = (acc[mappedType] || 0) + 1;
      return acc;
    }, {})}
    {@const enabledCheckboxId = `mod-enabled-${mod.id}`}
    <h1 title={mod.id}>{mod.label}</h1>
    <section>
      <dl>
        <dt>
          {#if enabledConflicts.length}
            {t("Enabled")}
          {:else}
            <label for={enabledCheckboxId}>{t("Enabled")}</label>
          {/if}
        </dt>
        <dd>
          {#if enabledConflicts.length}
            {t("Conflicts with")}
            {#each enabledConflicts as conflict, i}
              {#if i > 0}{", "}{/if}
              <a
                href="{import.meta.env.BASE_URL}mod/{encodeURIComponent(
                  conflict.id,
                )}{location.search}">{conflict.label}</a>
            {/each}
          {:else}
            <label class="checkbox enabled-checkbox">
              <input
                id={enabledCheckboxId}
                aria-label={t("Enabled")}
                type="checkbox"
                checked={enabledMods.includes(mod.id)}
                on:change={toggleMod(mod.id)} />
            </label>
          {/if}
        </dd>
        {#if modInfo?.authors?.length}
          <dt>{t("Authors")}</dt>
          <dd>{modInfo.authors.join(", ")}</dd>
        {/if}
        {#if modInfo?.maintainers?.length}
          <dt>{t("Maintainers")}</dt>
          <dd>{modInfo.maintainers.join(", ")}</dd>
        {/if}
        {#if conflicts.length}
          <dt>{t("Conflicts")}</dt>
          <dd>
            {#each conflicts as conflict, i}
              {#if i > 0}{", "}{/if}
              <a
                href="{import.meta.env.BASE_URL}mod/{encodeURIComponent(
                  conflict.id,
                )}{location.search}">{conflict.label}</a>
            {/each}
          </dd>
        {/if}
        {#if data.modsFetched}
          {#each reportedTypeEntries as [type, label]}
            {#if countByType[type]}
              {@const count = countByType[type]}
              <dt>{label}</dt>
              <dd>{count}</dd>
            {/if}
          {/each}
        {/if}
      </dl>
      {#if !data.modsFetched}
        <p><em>{t("Loading...")}</em></p>
      {/if}
      <p style="color: var(--cata-color-gray)">{mod.description}</p>
    </section>
    {#if enabledMods.includes(mod.id)}
      {#each reportedTypeEntries as [type, label]}
        {@const items = catalogItems(mod.id, type)}
        {#if items.length}
          <CatalogSection {type} title={label} {items} />
        {/if}
      {/each}
    {/if}
    {#if modInfo}
      <details>
        <summary>{t("Raw JSON")}</summary>
        <JsonView obj={modInfo} buildNumber={data.build_number} />
      </details>
    {/if}
  {:else}
    <p>{t("Mod not found.")}</p>
  {/each}
{/if}

<style>
.enabled-checkbox > input[type="checkbox"] {
  margin-right: 0;
  transform: translateY(-0.1em);
}
</style>
