
import path from 'path';
import type webpack from 'webpack';
import { findInDirectory, makeModule } from './modGen';

export interface ModGenPluginOptions {
    verbosity?: number;
    basePath: string;
}

export class ModGenPlugin {
    basePath: string;
    verbosity: number;

    constructor(options: ModGenPluginOptions) {
        this.verbosity = options.verbosity ?? 0;
        this.basePath = options.basePath;
    }
    apply(compiler: webpack.Compiler) {
        compiler.hooks.beforeCompile.tap('ModGenPlugin', (compilation: webpack.compilation.Compilation, cb) => {
            const modList = findInDirectory(this.basePath, {verbosity: this.verbosity});
            for (let mod of modList) {
                const outfileName = path.join(mod.path, 'module.ts');
                const fileContents = makeModule(mod, this.verbosity);
                compilation.assets[outfileName] = {
                    source() { return fileContents; },
                    size() { return fileContents.length; },
                };
            }
        });
    }
}