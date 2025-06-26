import rehypeRemark from 'rehype-remark';
import type { Node as HastNode, Text as HastText, Parent as HastParent } from 'hast';
import type { Node as MdastNode, Text as MdastText, Parent as MdastParent } from 'mdast';
import type { VFile } from 'vfile';
import type { Plugin } from 'unified';

/**
 * The official rehype-remark plugin gets a little aggressive with removing
 * spaces, so this wraps it with some space preservation.
 *
 * Ideally, this needs to be solved upstream in rehype-remark.
 * TODO: create a minimal test case and file a bug there!
 */

// Type guards
function isText(node: HastNode | MdastNode): node is HastText | MdastText {
  return node.type === 'text';
}

function hasChildren(node: HastNode | MdastNode): node is HastParent | MdastParent {
  return 'children' in node && Array.isArray(node.children);
}

function hasValue(node: HastNode | MdastNode): node is HastText | MdastText {
  return 'value' in node && typeof (node as any).value === 'string';
}

const rehype2remarkWithSpaces: Plugin<any[], HastNode, MdastNode> = function (...args: any[]) {
  const spaceToken = '++IAMASPACE++';

  function preserveInitialSpaces(node: HastNode): void {
    if (isText(node) && node.value.startsWith(' ')) {
      if (node.value.startsWith(' ')) {
        node.value = spaceToken + node.value.slice(1);
      }
      if (node.value.endsWith(' ')) {
        node.value = node.value.slice(0, -1) + spaceToken;
      }
    }
    if (hasChildren(node)) {
      node.children.forEach(preserveInitialSpaces);
    }
  }

  function recreateSpaces(node: MdastNode): void {
    if (hasValue(node)) {
      node.value = node.value.split(spaceToken).join(' ');
    }
    if (hasChildren(node)) {
      node.children.forEach(recreateSpaces);
    }
  }

  const convert = rehypeRemark.apply(this, args);
  
  return function (tree: HastNode, file?: VFile): MdastNode {
    preserveInitialSpaces(tree);
    const markdownTree = convert.call(this, tree, file);
    recreateSpaces(markdownTree);
    return markdownTree;
  };
};

export default rehype2remarkWithSpaces;