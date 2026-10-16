# Project Zomboid · Rosewood browser reconstruction

Work in progress. **Not a full recreation and not fidelity-validated.** This app
currently renders imported original local map/texture/character data and provides
an initial survival loop. Many gameplay rules are provisional. Vehicles, farming,
animals, the complete crafting catalogue, source UI/audio and many other systems
remain outstanding. The full user scope is retained in `research/scope.json`.

See [the complete process record](../../docs/project-zomboid/PROCESS.md).

## Local setup

Requires Python 3.10+, Node.js, `javac` (Java 17+), and your existing compatible local PZ installation
(tested static format: Steam build 25485521, B42 LOTH/LOTP v1).

```sh
npm ci
python3 import_assets.py --source "/path/to/ProjectZomboid"
python3 import_world.py --source "/path/to/ProjectZomboid"
python3 import_characters.py --source "/path/to/ProjectZomboid" --resolved-nodes "/path/to/private-research/resolved-nodes" --loaded-rotations "/path/to/private-research/rotations.tsv"
python3 import_held_models.py --source "/path/to/ProjectZomboid" --output private-assets/held-models
python3 import_items.py --source "/path/to/ProjectZomboid"
python3 import_recipes.py --source "/path/to/ProjectZomboid" --output private-assets/recipes.json
python3 import_trees.py --source "/path/to/ProjectZomboid" --erosion-config "/path/to/isolated-test-save/erosion.ini"
python3 serve.py --port 8876
```

Open http://127.0.0.1:8876. Imports refuse an existing output directory; preserve
old outputs and use `--output` for a fresh conversion. Imported source material is
under ignored `private-assets/`, not part of the code repository. Do not publish
that directory with the app. Imports read the original installation without
altering it or touching original saves.

The character import now requires inherited turn-node XML resolved by the
installed parser. Create a fresh private output directory (not in the public
repository), compile `adapters/AnimationNodeProbe.java`, then run the following
from the installation's `Project Zomboid.app/Contents/Java` directory, using its
bundled Java runtime. `PROBE_CLASSES`, `PRIVATE_RUN`, and `PZ_JAVA` below are
absolute paths you supply:

```sh
"$PZ_JAVA" -Dsre.probeCache="$PRIVATE_RUN/cache" -Dsre.resolvedNodes="$PRIVATE_RUN/resolved-nodes" \
  -cp "$PROBE_CLASSES:./*" AnimationNodeProbe media/AnimSets/player "$PRIVATE_RUN/nodes.tsv" \
  turning/turn_idle_90L.xml turning/turn_idle_90R.xml \
  turningIdle180/turn_idle_180L.xml turningIdle180/turn_idle_180R.xml
```

Also compile `adapters/AnimationImportProbe.java` into `PROBE_CLASSES`. From the
same installation directory, export the four turn clips' complete rotation keys:

```sh
"$PZ_JAVA" -Djava.library.path=. -cp "$PROBE_CLASSES:./*" AnimationImportProbe \
  media/anims_X/Bob "$PRIVATE_RUN/rotations.tsv"
```

Use `--loaded-rotations "$PRIVATE_RUN/rotations.tsv"` during character import.
The importer also includes the `Build` / `Bob_IdleHammering` action. To capture
its runtime-loaded rotations in the same TSV, append the four turn clip names
and `Bob_IdleHammering` after the probe's output path; explicit names replace
the probe's default four-clip list. The current game activates this loop during
wooden window barricading, after nominal standing-turn preparation. Hammer and
Plank hand models are imported separately with body/item attachment transforms.
Other equipment models, runtime appearance variants, sound events, health/moodle
timing modifiers and source gameplay comparison remain incomplete.
The importer validates full bone/key/timeline coverage for each supplied clip;
without this optional input it retains raw text rotations, which have a known
small mismatch against the installed loader. Position, scale and other clips
still require runtime-loader validation.

Use that `resolved-nodes` directory for the import command. The probe refuses
existing output files; it preserves inherited XML via the original parser.
Imported turn clips are currently research previews, not gameplay turn parity.

Controls: WASD/arrow keys move relative to the screen, Shift runs, Ctrl sneaks,
E interacts, Space attacks, mouse wheel zooms, I inventory, H health, C crafting,
M map, J journal, P pause, Escape cancels an action/closes a panel. Click nearby
action buttons to choose an interaction. The save panel supports local storage
and JSON export/import. The app pauses when the browser loses focus.

## Validation

```sh
npm test
python3 -m unittest discover -s tests -p 'test_*.py' -v
# Requires installed Google Chrome and the server above:
node tests/browser.mjs
```

Unit tests use synthetic fixtures; browser tests exercise the actual target app.
Neither is original-game runtime differential evidence. Browser results and
captures are under ignored `test-results/`. Current screenshots have not been
calibrated against the original game; missing sprites remain explicitly visible
in runtime diagnostics rather than being reported as complete coverage.

## Architecture

- Installation readers: `import_assets.py`, `import_world.py`, `import_characters.py`, `import_items.py`.
- Streaming world and collision: `src/world.js`.
- Provisional target simulation: `src/simulation.js`.
- Atlas/isometric rendering and skinned source models: `src/render.js`, `src/characters.js`.
- Browser UI, controls and persistence: `src/main.js`.

The current UI and zombie appearance are partial adaptations, not faithful
copies of the complete original interface/character variation. Data presence,
screen rendering and gameplay parity are tracked separately.

Tree import currently supports the macOS installation layout and executes the
bundled source JRE in a separate process for noise/RNG and read-only constants.
It reads an explicitly selected isolated test save's erosion configuration.
The inferred initial tree selection and fixed summer leaves are not source-world
visual parity evidence; seasonal blending, snow and growth remain outstanding.
The browser itself does not require Java.

### Comic title catalog

The browser also requires `private-assets/comics.json`. Compile
`adapters/ComicRegistryProbe.java` into the private `PROBE_CLASSES` directory.
Run it from the installation's Java directory with the bundled runtime:

```sh
"$PZ_JAVA" -cp "$PROBE_CLASSES:./*" ComicRegistryProbe > "$PRIVATE_RUN/comic-registry.tsv"
```

Then, from this app directory, import the registry and installed English labels:

```sh
python3 import_comics.py --registry "$PRIVATE_RUN/comic-registry.tsv" \
  --media "/path/to/ProjectZomboid/Project Zomboid.app/Contents/Java/media" \
  --output private-assets/comics.json
```

New ordinary and retail comics now receive title/issue identities and display
names. Retail selection retries out-of-print series. The native registry has
224 series in the pinned build. Names currently use imported English comic
labels; complete language switching remains unfinished. Existing saves are not
randomly renamed. The read cooldown key is a translation key plus an unpadded
issue number, distinct from the localized display name. Import `ComicBook` with
`import_held_models.py --models ... ComicBook` alongside the other required hand
models to display the open comic during reading.

### Reading audio

From this app directory, render the six installed literature events using the
bundled macOS FMOD 2.03.09 libraries. Choose fresh output/capture directories:

```sh
python3 import_reading_audio.py \
  --java "/path/to/ProjectZomboid/Project Zomboid.app/Contents/Java" \
  --output private-assets/reading-audio --captures "$PRIVATE_RUN/reading-audio-raw"
```

The importer preserves raw offline WAVs and removes exactly the native DSP-clock
frames preceding event start. The browser requires the resulting manifest and
samples; normal pointer/keyboard interaction unlocks Web Audio. Reading emits
open/close sounds and the reading animation's PageFlip event at normal game speed.
These are isolated default event renders, currently one sample per event; full
FMOD random variation, spatial effects, gameplay mixing and perceptual parity
remain unverified. No audio device is used during import.

### Skill-book coverage

Reading dispatch supports all 24 installed skill-book categories, with independent
perk identities, page memory and five-volume multipliers. Aiming, Reloading and
LongBlade use half-strength bonuses. Other skills' XP-award paths remain incomplete.
For hand art, include these additional installed models when importing held models:
`Book12 Book13 Book14 BookBrown BookDarkCyan BookGreen BookGrey BookLightBlue
BookLightGreen BookOpenTINT BookPurple BookRedPink BookYellow BookYellowBrown`.
Static registry comparison and target reading tests do not establish full native
gameplay fidelity or all-cover visual acceptance.

## GitHub Pages and tian.house

The user authorized hosting the converted local runtime assets on 2026-10-12 so visitors can play without selecting a folder. The production domain is https://tian.house/. Saves remain browser-local; export/import JSON to transfer between localhost, the former Pages origin and this domain.

Build the hosted site with:

```sh
python3 deploy_pages.py --out /path/to/tian.house --include-assets
```

The explicit asset option copies only converted PNG/JSON/WAV resources, strips local absolute provenance paths and losslessly recompresses PNG scanlines. It excludes source binaries, private research captures and player saves. Record source ownership separately; the user’s noncommercial statement is not a third-party license.

Without `--include-assets`, a fresh output directory contains code, Three.js and the local-folder import fallback. Do not accidentally reuse a hosted-assets directory as a code-only publication.

The map now covers one residence, yard and garage, with a separate residence save slot. The bedroom computer opens the CRT portfolio desktop. All product UI defaults to English; full gameplay and original-game acceptance remain in progress.
