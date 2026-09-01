<script lang="ts">
import { setContext } from "svelte";
import { t } from "@transifex/native";
import { CddaData, getAllObjectSources, mapType } from "../data";
import type { SupportedTypeMapped, SupportedTypesWithMapped } from "../types";
import CatalogSection from "../CatalogSection.svelte";
import JsonView from "../JsonView.svelte";

export let data: CddaData;
export let enabledMods: string[];
export let setModEnabled: (mod: string, enabled: boolean) => void;
export let modId: string;

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

$: mod = data.availableMods.find((candidate) => candidate.id === modId);

setContext("data", data);
</script>

{#if mod}
  {@const modData = data.getRawModData(mod.id)}
  {@const modInfo = data.getModInfo(mod.id)}
  {@const conflicts = knownConflicts(modInfo?.conflicts)}
  {@const enabledConflicts = conflictingEnabledMods(mod.id, modInfo?.conflicts)}
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
      {#if data.hasFetchedMods}
        {#each reportedTypeEntries as [type, label]}
          {#if countByType[type]}
            {@const count = countByType[type]}
            <dt>{label}</dt>
            <dd>{count}</dd>
          {/if}
        {/each}
      {/if}
    </dl>
    {#if !data.hasFetchedMods}
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
{/if}

<style>
.enabled-checkbox > input[type="checkbox"] {
  margin-right: 0;
  transform: translateY(-0.1em);
}
</style>
