<script lang="ts">
	import { db } from '$lib/states/db';
	import * as Y from 'yjs';
	let a = 'loading';

	db.instant._core.subscribeQuery(
		{
			tasks: {}
		},
		(resp) => {
			console.log(resp);
			// a = JSON.stringify(resp);
		}
	);

	// db.texts.set('ed520edd-acc8-4621-a007-8f1031df31db', new Y.Text('doc-title'));
	// db.notes.set('94c3d151-eafb-4121-8fd8-4fb3935d4bd2', new Y.Text('notes'));
</script>

<!-- {a} -->
