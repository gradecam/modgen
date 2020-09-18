
reloadModGen(); // used during development if you reload this module it'll reload the other modules too
export {
    moduleDef,
    writeModule,
    makeModule,
    processDirectory,
    ModGenOptions,
} from './modGen';

export {
    ModGenPlugin, ModGenPluginOptions,
} from './webpackPlugin';

function reloadModGen() {
    for (const path of [
        require.resolve('./matchers'),
        require.resolve('./modGen'),
    ]) {
        delete require.cache[require.resolve(path)];
    }
}