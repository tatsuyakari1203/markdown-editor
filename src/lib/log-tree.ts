/**
 * A rehype plugin that logs the current (HTML) tree.
 */
import type { Node, Element, Text, Parent } from 'hast';
import type { Plugin } from 'unified';

// Type guards
function isElement(node: Node): node is Element {
  return node.type === 'element';
}

function isText(node: Node): node is Text {
  return node.type === 'text';
}

function hasChildren(node: Node): node is Parent {
  return 'children' in node && Array.isArray(node.children);
}

function hasValue(node: Node): node is Text {
  return 'value' in node && typeof (node as any).value === 'string';
}

const logTree: Plugin<[], Node, Node> = () => {
  function logNode(node: Node, indent = 0): void {
    let name = `(${node.type})`;
    
    if (hasValue(node)) {
      name = `${name}: \`${node.value}\``;
    } else if (isElement(node)) {
      name = `<${node.tagName}>`;
    }

    console.log(`${' '.repeat(indent)}- ${name}`);

    if (hasChildren(node)) {
      node.children.forEach((child) => logNode(child, indent + 2));
    }
  }

  return (tree: Node) => {
    logNode(tree);
    return tree;
  };
};

export default logTree;