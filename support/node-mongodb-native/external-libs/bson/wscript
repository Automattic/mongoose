import Options
from os import unlink, symlink, popen
from os.path import exists 

srcdir = "."
blddir = "build"
VERSION = "0.1.0"

def set_options(opt):
  opt.tool_options("compiler_cxx")
  opt.add_option( '--debug'
                , action='store_true'
                , default=False
                , help='Build debug variant [Default: False]'
                , dest='debug'
                )  

def configure(conf):
  conf.check_tool("compiler_cxx")
  conf.check_tool("node_addon")
  # conf.env.append_value('CXXFLAGS', ['-DDEBUG', '-g', '-O0', '-Wall', '-Wextra'])

  # conf.check(lib='node', libpath=['/usr/lib', '/usr/local/lib'], uselib_store='NODE')

def build(bld):
  obj = bld.new_task_gen("cxx", "shlib", "node_addon")
  obj.target = "bson"
  obj.source = ["bson.cc", "long.cc", "objectid.cc", "binary.cc", "code.cc", "dbref.cc", "timestamp.cc", "local.cc"]
  # obj.uselib = "NODE"

def shutdown():
  # HACK to get compress.node out of build directory.
  # better way to do this?
  if Options.commands['clean']:
    if exists('bson.node'): unlink('bson.node')
  else:
    if exists('build/default/bson.node') and not exists('bson.node'):
      symlink('build/default/bson.node', 'bson.node')
