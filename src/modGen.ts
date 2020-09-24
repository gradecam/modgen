// tslint:disable: no-require-imports
import fs from 'fs';
import glob from 'glob';
import _ from 'lodash';
import path from 'path';
import { modGenIgnoreComment, reCommentAfter, reCommentBeforeConstructor, reCommentBeforeFunction, reCommentBeforeTS, reContainsModgenComment, stripComments } from './matchers';
const tplText = fs.readFileSync(path.resolve(__dirname, 'tpl', 'modGen.tpl')).toString();
const tpl = _.template(tplText);

// allow running as a script, e.g. `node modGen.js some/path`
if (require.main === module) { processDirectory(process.argv[2]); }

export function findInDirectory(baseDir: string, options?: ModGenOptions) {
    const modules = glob.sync(baseDir + '/**/module.config.+(js|json|ts)');
    return modules.map(modFile => {
        if (options.verbosity >= 2) {
            console.log(" Loading", modFile);
        }
        const mod: moduleDef = _.clone(require(`${modFile}`));
        delete require.cache[require.resolve(`${modFile}`)];
        for (let dep of mod.dependencies) {
            (<any>dep).__modname__ = (<any>dep).modname ? (`"${(<any>dep).modname}"`) : dep.varname;
        }
        mod.path = path.dirname(modFile);
        return mod;
    });
}

// Options for verbosity:
// 0 = completely silent
// 1 = print a summary
// 2 = list each module encountered
// 3 = list each file encountered within a module
function processDirectory(baseDir: string, options?: ModGenOptions) {
    const allMods = findInDirectory(baseDir, options);
    for (let mod of allMods) {
        if (options.verbosity >= 2) {
            console.log(" Loading", mod.path);
        }
        writeModule(mod, options);
    }
    if (options.verbosity >= 1) {
        console.log("Modules processed: %s", allMods.length);
    }
}

export interface ModGenOptions {
    /** Should we add requirejs plugin prefixes for importing. 'text!' for jst and 'html!' for html files */
    addPluginPrefix?: boolean;
    verbosity?: number;
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

/**
 * Module definition, this is the export type of module.tpl.ts
 */
export interface moduleDef {
    /** Path to the directory of the module (where module.tpl.ts resides) */
    path: string;
    /** name of the module; the module will return this value */
    name: string;
    /** Array of dependencies for this module, added to the  */
    dependencies: moduleDependency[];
}
interface moduleDependency {
    file: string;
    varname: string;
    angular?: boolean;
}

function writeModule(mod: moduleDef, options?: ModGenOptions) {
    const moduleFileTxt = makeModule(mod, options);

    fs.writeFileSync(`${mod.path}/module.ts`, moduleFileTxt, {flag:'w'});
}

function makeModule(mod: moduleDef, options?: ModGenOptions) {
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
            if (options.addPluginPrefix) {
                plugin = match[0].substr(-4) === '.jst' ? 'text!' : 'html!';
            }
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
        if (options.verbosity >= 3) {
            console.log("  ▪", f);
        }
        const ret = getVarnameEtAl(f);

        const absPath = path.join(mod.path, f);
        const file = fs.readFileSync(absPath).toString();
        if (modGenIgnoreComment.exec(file)) {
            ret.type = 'ignore';
            return ret;
        }
        let functionPartMatches: RegExpExecArray;
        let parsedRegName: string;
        let injectionString: string;
        if ((functionPartMatches = reCommentBeforeFunction.exec(file))) {
            ret.type = functionPartMatches[1];
            ret.order = functionPartMatches[2];
            parsedRegName = functionPartMatches[3];
            injectionString = functionPartMatches[4];
        } else if ((functionPartMatches = reCommentBeforeConstructor.exec(file))) {
            parsedRegName = functionPartMatches[1];
            ret.type = functionPartMatches[2];
            ret.order = functionPartMatches[3];
            injectionString = functionPartMatches[4];
        } else if ((functionPartMatches = reCommentBeforeTS.exec(file))) {
            ret.type = functionPartMatches[1];
            ret.order = functionPartMatches[2];
            parsedRegName = functionPartMatches[3];
            injectionString = functionPartMatches[4];
        } else if ((functionPartMatches = reCommentAfter.exec(file))) {
            parsedRegName = functionPartMatches[1];
            injectionString = functionPartMatches[2];
            ret.type = functionPartMatches[3];
            ret.order = functionPartMatches[4];
        } else {
            let fileHasModGenComment = reContainsModgenComment.exec(file);
            if (!!fileHasModGenComment) {
                console.warn(`\x1b[33m${ret.filename}\x1b[0m contains modGen comment '\x1b[36m${fileHasModGenComment[0]}\x1b[0m', but modGen did not parse it correctly`);
            }
            return ret;
        }
        ret.order = Number(ret.order) || Infinity; // sometimes a file needs to be ordered by more than just its name
        ret.regObj = ret.varname;
        ret.regName = parsedRegName || ret.varname;

        const fargs = (injectionString||'').split(',').map(arg => {
            arg=arg.trim();
            arg = arg.replace(/^\S*(public|private|protected) /, '');
            arg = arg.split(':')[0];
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
        (modList, type) => modList.concat(type === 'ignore' ? [] : fileGroups[type]),
        [] as FilenameInfoStuff[]
    );

    const tplObjs = tplFiles.map(getVarnameEtAl);
    fileObjs = fileObjs.concat(tplObjs);

//    console.log("fileObjs: ", fileObjs);
    const moduleTxt = tpl({
        modName: mod.name,
        modPath: mod.path,
        deps: mod.dependencies,
        fileObjs,
        tplObjs,
        modTpl,
    });
    return moduleTxt;
}

export {
    processDirectory,
    writeModule,
    makeModule,
}
