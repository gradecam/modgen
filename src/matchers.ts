
export const reCommentAfter = /function[\s]*([\w]*)[\s]*\(([^\(\)\{\}]*)\)[\s]*{[\s]*\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?/m;
export const reCommentBefore = /[\s]*(?:export default class[\s]*([\w]*)[^]+)?\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?[\s]*(?:return[\s]*)?(?:function|constructor)[\s]*([\w]*)[\s]*\(([^\(\)\{\}]*)\)[\s]*{/m;
export const reCommentBeforeTS = /\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?[\s]*(?:export default (?:class|function)[\s]*([\w]*)[\s]*)(?:[^]+constructor[\s]*)?\(([^\(\)\{\}]*)\)/m;
export const reCommentBeforeClassVueTS = /\/\/[\s]*(?:angular|ng)[\s]*(?:vue component)(?: *\[(\d+)\])?[\s]*@Component()/;

const reComments = new RegExp('^\\s*(?://|/\\*.*\\*/).*$\\n?', 'm');
// strips simple single-line comments from a multiline string
export function stripComments(str: string) {
    while (reComments.test(str)) {
        str = str.replace(reComments, '');
    }
    return str;
}
