// tslint:disable: no-require-imports
import fs from 'fs';
import glob from 'glob';
import _ from 'lodash';
import path from 'path';
const tpl = _.template(fs.readFileSync('bin/modGen.tpl').toString());

const reCommentAfter = /function[\s]*([\w]*)[\s]*\(([^\(\)\{\}]*)\)[\s]*{[\s]*\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?/m;
const reCommentBefore = /[\s]*(?:export default class[\s]*([\w]*)[^]+)?\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?[\s]*(?:return[\s]*)?(?:function|constructor)[\s]*([\w]*)[\s]*\(([^\(\)\{\}]*)\)[\s]*{/m;
const reCommentBeforeTS = /\/\/[\s]*(?:angular|ng)[\s]*(component|directive|(?:component|directive) controller|controller|service|factory|provider|config|filter)(?: *\[(\d+)\])?[\s]*(?:export default (?:class|function)[\s]*([\w]*)[\s]*)(?:[^]+constructor[\s]*)?\(([^\(\)\{\}]*)\)/m;
const reCommentBeforeClassVueTS = /\/\/[\s]*(?:angular|ng)[\s]*(vue component)(?: *\[(\d+)\])?[\s]*@Component()/;

// allow running as a script, e.g. `node modGen.js some/path`
if (require.main === module) { exec(process.argv[2]); }

// Options for verbosity:
// 0 = completely silent
// 1 = print a summary
// 2 = list each module encountered
// 3 = list each file encountered within a module
function exec(baseDir: string, options?: {verbosity?: number}) {
    options = _.defaults(options || {}, {verbosity: 9});
    const modules = glob.sync(baseDir + '/**/module.config.ts');
    for (let modFile of modules) {
        if (options.verbosity >= 2) {
            console.log(" Loading", modFile);
        }
        const modPath = '../' + modFile;
        const mod: any = _.clone(require(modPath));
        delete require.cache[require.resolve(modPath)];
        for (let dep of mod.dependencies) {
            dep.__modname__ = dep.modname ? (`"${dep.modname}"`) : dep.varname;
        }
        mod.path = path.dirname(modFile);
        makeModule(mod, options.verbosity);
    }
    if (options.verbosity >= 1) {
        console.log("Modules processed: %s", modules.length);
    }
}


const reComments = new RegExp('^\\s*(?://|/\\*.*\\*/).*$\\n?', 'm');
// strips simple single-line comments from a multiline string
function stripComments(str: string) {
    while (reComments.test(str)) {
        str = str.replace(reComments, '');
    }
    return str;
}

interface FilenameInfoStuff {
    filename: string;
    fname: string;
    varname: string;
    plugin: string;
    type?: string;
    order?: string | number;
    regObj?: string;
    regName?: string;
    $inject?: string;
}

function makeModule(mod: any, verbosity: number) {
    let tsFiles = glob.sync('**/*{.ts,.js}', {cwd:mod.path});
        // we want both '.tpl.html' and '.jst' files registered with angular's templateCache
    let tplFiles = glob.sync('**/*{.tpl.html,.jst}', {cwd:mod.path});
    tsFiles = tsFiles.filter(f => !f.match('module') && !f.match('.spec.'));
    const modTplName = mod.path + '/module.tpl.ts';
    let modTpl: string;

    try {
        modTpl = fs.readFileSync(modTplName).toString();
        modTpl = stripComments(modTpl);
    } catch(e) {
        modTpl = '';
    }


    const usedVarnames: string[] = [];
    function getVarnameEtAl(f: string): FilenameInfoStuff {
        // var fname = f.split('.').shift();
        let fname = f.substr(0, f.lastIndexOf('.'));
        let varname = fname.split('/').pop().replace(/[^a-zA-Z_]/g, '_');
        let plugin = '';
        const tplRegex = /(\.tpl\.html$)|(\.jst$)/;
        const match = tplRegex.exec(f);
        if (match) {
            varname = fname.replace(/[^a-zA-Z_]/g, '_');
            fname = f;
            // jst files don't survive requirejs-html optimization
            plugin = match[0].substr(-4) === '.jst' ? 'text!' : 'html!';
        }
        let i = 1;
        let tmp = varname;
        while (usedVarnames.indexOf(tmp) !== -1) {
            tmp = `${varname}${i++}`;
        }
        varname = tmp;
        usedVarnames.push(varname);
        return {filename: f.split('/').pop(), fname: fname, varname: varname, plugin: plugin};
    }
    const fileGroups: _.Dictionary<FilenameInfoStuff[]> = _.groupBy(tsFiles.map(f => {
        if (verbosity >= 3) {
            console.log("  ▪", f);
        }
        const ret = getVarnameEtAl(f);

        const absPath = path.join(mod.path, f);
        const file = fs.readFileSync(absPath).toString();
        let functionPartMatches: RegExpExecArray;
        // tslint:disable-next-line: no-conditional-assignment
        if ((functionPartMatches = reCommentBeforeTS.exec(file))) {
            ret.type = functionPartMatches.splice(1, 1)[0];
            ret.order = functionPartMatches.splice(1, 1)[0];
        // tslint:disable-next-line: no-conditional-assignment
        } else if (functionPartMatches = reCommentBeforeClassVueTS.exec(file)) {
            ret.type = 'vue component';
            //ret.order
        // tslint:disable-next-line: no-conditional-assignment
        } else if ((functionPartMatches = reCommentBefore.exec(file))) {
            ret.type = functionPartMatches.splice(2, 1)[0];
            ret.order = functionPartMatches.splice(2, 1)[0];
            functionPartMatches.splice( functionPartMatches[1] ? 2 : 1, 1);
        // tslint:disable-next-line: no-conditional-assignment
        } else if ((functionPartMatches = reCommentAfter.exec(file))) {
            ret.order = functionPartMatches.pop();
            ret.type = functionPartMatches.pop();
        } else {
            return ret;
        }
        ret.order = Number(ret.order) || Infinity; // sometimes a file needs to be ordered by more than just its name
        ret.regObj = ret.varname;
        ret.regName = ret.varname;

        if(functionPartMatches[1]) {
            ret.regName = functionPartMatches[1];
        }

        const fargs = (functionPartMatches[2]||'').split(',').map(arg => {
            arg=arg.trim();
            arg = arg.replace(/^\S*(public|private|protected) /, '');
            arg = arg.replace(/:.+(,|$)/i, '');
            if(!arg.length || arg === 'this') { return null; }
            return `'${arg}'`;
        });
        ret.$inject = fargs.filter(x => !!x).join(',');
        // typically used with Typescript `export default` syntax, e.g. `export default class myController`
        if (/exports.default ?= ?[\w]+;/.test(file)) {
            ret.regObj += '.default';
        }

        return ret;
    }), m => m.type);

    // sort each group by order
    for (let [type, mods] of Object.entries(fileGroups)) {
        fileGroups[type] = _.sortBy(mods, m => m.order);
    }

    // order the modules for insertion (providers first, then alphabetic)
    const orderedGroups = _.sortBy(Object.keys(fileGroups), type => type === 'provider' ? '0' : type);

    // add each group in the right order
    let fileObjs = orderedGroups.reduce(
        (modList, type) => modList.concat(fileGroups[type]),
        [] as FilenameInfoStuff[]
    );

    const tplObjs = tplFiles.map(getVarnameEtAl);
    fileObjs = fileObjs.concat(tplObjs);

//    console.log("fileObjs: ", fileObjs);
    fs.writeFileSync(mod.path + '/module.ts', tpl({fileObjs: fileObjs, tplObjs: tplObjs, modName: mod.name, modPath: mod.path, deps: mod.dependencies, modTpl: modTpl}), {flag:'w'});
}

export = exec;
