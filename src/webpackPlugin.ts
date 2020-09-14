
import webpack from 'webpack';
import { processDirectory } from './modGen';

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
        compiler.hooks.beforeCompile.tap('ModGenPlugin', (compilation, cb) => {
            processDirectory(this.basePath, {verbosity: this.verbosity});
        });
    }
}