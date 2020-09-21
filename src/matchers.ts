
export const reContainsModgenComment = /\/(\/|\*+)[\s]*(angular|ng)[\s]*(vue component|component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)/;
export const modGenIgnoreComment = /\/(\/|\*+)[\s]*modGen[:\s]ignore/;
/**
 * 1. regName
 * 2. Injection string
 * 3. Type
 * 4. Order
 */
export const reCommentAfter = /function[\s]*([\w]*)[\s]*\(([^]*?)\)(?:[\s]*{|[\s]*:[^]*{)[\s]*\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?/m;
/**
 * 1. Type
 * 2. Order
 * 3. regName
 * 4. Injection string
 */
export const reCommentBeforeFunction = /\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?[\s]*(?:return[\s]*)?function[\s]*([\w]*)[\s]*\(([^]*?)\)[\s]*[:{]/m;
/**
 * 1. regName
 * 2. Type
 * 3. Order
 * 4. Injection string
 */
export const reCommentBeforeConstructor = /(?:export default class[\s]*([\w]*)[^]+)\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?[\s]*constructor[\s]*\(([^]*?)\)[\s]*{/m;
/**
 * 1. Type
 * 2. Order
 * 3. regName
 * 4. Injection string
 */
export const reCommentBeforeTS = /\/(?:\/|\*)[\s]*(?:angular|ng)[\s]*(vue component|component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?(?: *\*\/)?[\s]*(?:(?:export default)?[\s]*(?:class|function)[\s]*([\w]*)[\s]*)(?:[^]+constructor[\s]*)?(?:\(([^\(\)\{\}]*)\))?/m;

const reComments = new RegExp('^\\s*(?://|/\\*.*\\*/).*$\\n?', 'm');
// strips simple single-line comments from a multiline string
export function stripComments(str: string) {
    while (reComments.test(str)) {
        str = str.replace(reComments, '');
    }
    return str;
}
