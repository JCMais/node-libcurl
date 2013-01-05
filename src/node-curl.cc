#include "node-curl.h"

extern "C"
void init(v8::Handle<v8::Object> target)
{
	NodeCurl::Initialize(target);
}

#ifdef NODE_MODULE
NODE_MODULE(node_curl, init)
#endif
