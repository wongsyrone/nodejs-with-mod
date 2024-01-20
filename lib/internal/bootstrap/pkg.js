'use strict';

const {
  prepareMainThreadExecution
} = require('internal/bootstrap/pre_execution');

prepareMainThreadExecution(true);

const canStdStreamLog = internalBinding('worker').isMainThread;
let debug;
function noop() {}
if (canStdStreamLog) {
  debug = require('internal/util/debuglog').debuglog('pkg', (fn) => {
    debug = fn;
  });
} else {
  debug = noop;
}

debug(`internal/bootstrap/pkg.js: canStdStreamLog ${canStdStreamLog}`);
(function () {
  var __require__ = require;
  var fs = __require__('fs');
  var vm = __require__('vm');
  var path = __require__('path');
  function readPrelude (preludeFullPath, payloadFullPath) {
    var ret = {payloadFd: -1};
    var PAYLOAD_POSITION = 0;
    var PAYLOAD_SIZE = 0;
    var statOpt = {throwIfNoEntry: false};
    var preludeStat = fs.statSync(preludeFullPath, statOpt);
    var payloadStat = fs.statSync(payloadFullPath, statOpt);
    if (preludeStat === undefined) {
      debug("internal/bootstrap/pkg.js: no prelude - remove entrypoint from argv[1]");
      process.argv.splice(1, 1);
      return { undoPatch: true };
    }
    if (payloadStat !== undefined) {
      PAYLOAD_SIZE = payloadStat.size;
      ret.payloadFd = fs.openSync(payloadFullPath, 'r');
    }
    var prelude = fs.readFileSync(preludeFullPath);
    debug(`internal/bootstrap/pkg.js: Run Pkg prelude`);
    var s = new vm.Script(prelude, { filename: 'pkg/prelude/bootstrap.js' });
    var fn = s.runInThisContext();
    let fnret = fn(process, __require__,
      console, ret.payloadFd, PAYLOAD_POSITION, PAYLOAD_SIZE);
    Object.assign(ret, fnret);
    return ret;
  }
  (function () {
    let currWorkDir = process.cwd();
    debug("internal/bootstrap/pkg.js: execPath", process.execPath, "currWorkDir", currWorkDir, "argv", process.argv);
    var baseName = path.win32.basename(process.execPath);
    var dirName = path.dirname(process.execPath);
    var preludeFileName = `${baseName}_prelude.js`;
    var payloadFileName = `${baseName}_payload`;
    var preludeFullPath = path.join(dirName, preludeFileName);
    var payloadFullPath = path.join(dirName, payloadFileName)
    debug("internal/bootstrap/pkg.js: preludeFullPath", preludeFullPath, "payloadFullPath", payloadFullPath);

    var result = readPrelude(preludeFullPath, payloadFullPath);
    debug("internal/bootstrap/pkg.js: readPrelude ret", result, "argv", process.argv);
    if (result && result.undoPatch) {
      debug("internal/bootstrap/pkg.js: undoPatch");
      var bindingFs = process.binding('fs');
      fs.internalModuleStat = bindingFs.internalModuleStat;
      fs.internalModuleReadJSON = bindingFs.internalModuleReadJSON;
      if (result.payloadFd && result.payloadFd != -1) fs.closeSync(result.payloadFd);
    }
  }());
}());
