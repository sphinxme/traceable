import { Image } from '@tiptap/extension-image';
import { mount, unmount } from 'svelte';
import ImageNodeView from '../image-node/ImageNodeView.svelte';
import type { NodeViewRenderer, NodeViewRendererProps } from '@tiptap/core';

export const CustomImage = Image.extend({
	name: 'image',

	addAttributes() {
		return {
			...this.parent?.(),
			width: {
				default: null,
				parseHTML: (element) => {
					const width = element.getAttribute('width');
					const styleWidth = element.style.width;
					if (styleWidth) {
						const match = styleWidth.match(/^(\d+)px$/);
						if (match) {
							return parseInt(match[1], 10);
						}
					}
					return width ? parseInt(width, 10) : null;
				},
				renderHTML: (attributes) => {
					if (!attributes.width) {
						return {};
					}
					return {
						width: attributes.width,
						style: `width: ${attributes.width}px`,
					};
				},
			},
			height: {
				default: null,
				parseHTML: (element) => {
					const height = element.getAttribute('height');
					const styleHeight = element.style.height;
					if (styleHeight) {
						const match = styleHeight.match(/^(\d+)px$/);
						if (match) {
							return parseInt(match[1], 10);
						}
					}
					return height ? parseInt(height, 10) : null;
				},
				renderHTML: (attributes) => {
					if (!attributes.height) {
						return {};
					}
					return {
						height: attributes.height,
						style: `height: ${attributes.height}px`,
					};
				},
			},
		};
	},

	addNodeView(): NodeViewRenderer {
		return ({ node, editor, getPos }: NodeViewRendererProps) => {
			const container = document.createElement('div');
			container.className = 'tiptap-image-node-wrapper';

			let latestNode = node;

			const instance = mount(ImageNodeView, {
				target: container,
				props: {
					node: latestNode,
					editor,
					getPos,
				},
			});

			return {
				dom: container,
				contentDOM: null,
				update(updatedNode) {
					if (updatedNode.type !== node.type) {
						return false;
					}
					latestNode = updatedNode;
					if (instance.updateNode) {
						instance.updateNode(updatedNode);
					}
					return true;
				},
				destroy() {
					unmount(instance);
				},
			};
		};
	},
});
