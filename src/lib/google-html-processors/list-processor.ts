import { visit } from 'unist-util-visit';
import type { Node } from 'hast';
import { BaseProcessor } from './base-processor';
import { isList, isElement, hasChildren } from '../type-guards';

/**
 * Fix the incorrect formatting of nested lists in Google Docs's HTML. Lists
 * can only have `div` and `li` children, but Google Docs has other lists as
 * direct descendents. This moves those free-floating lists into the previous
 * `li` element under the assumption that they represent subitems of it.
 */
export class ListProcessor extends BaseProcessor {
  process(tree: Node): void {
    this.fixNestedLists(tree);
  }

  private fixNestedLists(node: Node): void {
    visit(node, isList, (listNode, index, parent) => {
      if (parent && isList(parent) && typeof index === 'number') {
        const previous = parent.children[index - 1];
        if (isElement(previous) && previous.tagName === 'li') {
          if (!hasChildren(previous)) {
            previous.children = [];
          }
          previous.children.push(listNode);
          parent.children.splice(index, 1);
          return index;
        } else {
          this.logWarning('No previous list item to move nested list into!');
        }
      }
    });
  }
}