def set_options(opt):
  opt.tool_options('compiler_cxx')

def configure(conf):
  conf.check_tool('compiler_cxx')
  conf.check_tool('node_addon')
  conf.env.append_unique('CXXFLAGS', ['-Wall', '-O1', '-fno-inline-functions'])
  conf.env['LIB_CURL'] = 'curl'

def build(bld):
  obj = bld.new_task_gen('cxx', 'shlib', 'node_addon', uselib="CURL")
  obj.target = 'node-curl'
  obj.source = [
    'src/node-curl.cc',
  ]
