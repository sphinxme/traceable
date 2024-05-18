<script lang="ts">
    import type { Database } from "./data";
    import { note } from "./note_editor";
    import * as Y from "yjs";

    export let text: Y.Text;
</script>

<div use:note={text} />
