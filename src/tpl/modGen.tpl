// DO NOT EDIT.
// Auto generated module file. Regenerate with "grunt exec:modGen" if necessary.
// <%= modPath %>

<%= _.map(fileObjs, function(o) { return '/// <amd-dependency path="' + o.plugin + './' + o.fname + '" />'; }).join('\n') %>
<%= _.map(_.filter(deps, function(dep) { return !/\/module$/.test(dep.file); }), function(dep) { return '/// <amd-dependency path="' + dep.file + '" />'; }).join('\n') %>

import * as ng from 'angular';
<%= _.map(_.filter(deps, function(dep) { return /\/module$/.test(dep.file); }), function(dep) { return "import " + dep.varname + " from '" + dep.file + "';" }).join('\n') %>

// tslint:disable no-var-requires no-require-imports variable-name
<%= _.map(fileObjs, function(o) { return 'const ' + o.varname + ' = require("' + o.plugin + './' + o.fname + '");'; }).join('\n') %>
<%= _.map(_.filter(deps, function(dep) { return !/\/module$/.test(dep.file); }), function(dep) { return 'const ' + dep.varname + ' = require("' + dep.file + '");'; }).join('\n') %>

const moduleName = '<%= modName %>';
export default moduleName;
const mod = ng.module(moduleName, [<%= (deps||[]).filter(d => !!d.angular).map(d => /\/module$/.test(d.file) ? `${d.__modname__}` : `(${d.__modname__} as any).default ?? ${d.__modname__}`).join(', ') %>]);

<% print(modTpl) %>
<% _.each(fileObjs, function(fobj) { if (fobj.$inject && fobj.$inject.length > 0) { %>(<%= fobj.regObj %>).$inject=[<%= fobj.$inject %>];
<% } %><% }); %>
<% if (_.filter(fileObjs, function(o) { return !!o.regObj; }).length) { %>mod<% _.each(fileObjs, function(fobj) { if (!fobj.regObj) { return; }
switch(fobj.type) {
    case 'component': %>
    .<%= fobj.type %>('<%= fobj.regName %>', (<%= fobj.regObj %>.default ?? <%= fobj.regObj %>)())<% break;
    case 'component controller': %>
    .component('<%= fobj.regName %>', <%= fobj.regObj %>.default?.$$$component$$$ ?? <%= fobj.regObj %>.$$$component$$$)<% break;
    case 'directive controller': %>
    .directive('<%= fobj.regName %>', <%= fobj.regObj %>.default?.$$$directive$$$ ?? <%=fobj.regObj %>.$$$directive$$$)<% break;
    case 'vue component': %>
    .value('<%= fobj.regName %>', <%= fobj.regObj %>.default ?? <%= fobj.regObj %>)<% break;
    case 'config': %>
    .<%= fobj.type %>(<%= fobj.regObj %>.default ?? <%= fobj.regObj %>)<% break;
    default: %>
    .<%= fobj.type %>('<%= fobj.regName %>', <%= fobj.regObj %>.default ?? <%= fobj.regObj %>)<% break;
}
}); %>;<% } %>
<% if (tplObjs.length) {
%>mod.run(['$templateCache', function($templateCache) {<%
    _.each(tplObjs, function(tpl) {%>
    $templateCache.put("<%- tpl.fname %>", <%- tpl.varname %>);<%
    });%>
}]);<% } %>

