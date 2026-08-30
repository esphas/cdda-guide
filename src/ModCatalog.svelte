<script lang="ts">
import { setContext } from "svelte";
import { t } from "@transifex/native";
import { CddaData, getAllObjectSources, mapType } from "./data";
import type { SupportedTypeMapped, SupportedTypesWithMapped } from "./types";
import CatalogSection from "./CatalogSection.svelte";

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

setContext("data", data);
</script>

{#if !modId}
  <h1>{t("Mods")}</h1>
  {#if displayedMods.length}
    <section>
      <ul>
        {#each displayedMods as mod}
          <li>
            <a
              href="{import.meta.env.BASE_URL}mod/{encodeURIComponent(
                mod.id,
              )}{location.search}">{mod.label}</a>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p>{t("No mods found.")}</p>
  {/if}
{:else}
  {#each displayedMods as mod (mod.id)}
    {@const modData = data.getRawModData(mod.id)}
    {@const countByType = modData.reduce((acc, item) => {
      const mappedType = mapType(item.type);
      const mappedTypeOrOther =
        mappedType in reportedTypes ? mappedType : "other";
      acc[mappedTypeOrOther] = (acc[mappedTypeOrOther] || 0) + 1;
      return acc;
    }, {})}
    {@const enabledCheckboxId = `mod-enabled-${mod.id}`}
    <h1 title={mod.id}>{mod.label}</h1>
    <section>
      <dl>
        <dt>
          <label for={enabledCheckboxId}>{t("Enabled")}</label>
        </dt>
        <dd>
          <label class="checkbox enabled-checkbox">
            <input
              id={enabledCheckboxId}
              aria-label={t("Enabled")}
              type="checkbox"
              checked={enabledMods.includes(mod.id)}
              on:change={toggleMod(mod.id)} />
          </label>
        </dd>
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
      <p style="color: var(--cata-color-gray); font-style: italic">
        {mod.description}
      </p>
    </section>
    {#if enabledMods.includes(mod.id)}
      {#each reportedTypeEntries as [type, label]}
        {@const items = catalogItems(mod.id, type)}
        {#if items.length}
          <CatalogSection {type} title={label} {items} />
        {/if}
      {/each}
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
