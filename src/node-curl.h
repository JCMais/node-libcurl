#ifndef NODE_CURL_NOHE_CURL_H
#define NODE_CURL_NOHE_CURL_H

#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <curl/curl.h>
#include <map>
#include <vector>
#include <string>
#include <stdlib.h>
#include <string.h>

#define NODE_CURL_EXPORT(name) export_curl_options(t, #name, name, sizeof(name) / sizeof(CurlOption));

class NodeCurlHttppost
{
    public:
	curl_httppost *first;
	curl_httppost *last;

    public:
	NodeCurlHttppost()
	: first(NULL), last(NULL)
	{
		reset();
	}

	~NodeCurlHttppost()
	{
		reset();
	}

	void reset()
	{
		curl_httppost *cur  = first;
		while (cur) {
			curl_httppost *next = cur->next;
			if (cur->contenttype)
				free(cur->contenttype);
			if (cur->contents && cur->flags & HTTPPOST_FILENAME)
				free(cur->contents);
			if (cur->buffer)
				free(cur->buffer);
			if (cur->name)
				free(cur->buffer);
			free(cur);
			cur = next;
		}
		first = NULL;
		last  = NULL;
	}

	void append()
	{
		if (!first) {
			first = (curl_httppost*)calloc(1, sizeof(curl_httppost));
			last  = first;
		} else {
			last->next = (curl_httppost*)calloc(1, sizeof(curl_httppost));
			last = last->next;
		}
	}

	enum {
		NAME,
		FILE,
		CONTENTS,
		TYPE
	};

	void set(int field, char *value, long length)
	{
		switch (field) {
		    case NAME:
			value = strndup(value, length);
			last->name = value;
			last->namelength = length;
			break;
		    case TYPE:
			value = strndup(value, length);
			last->contenttype = value;
			break;
		    case FILE:
			value = strndup(value, length);
			last->flags |= HTTPPOST_FILENAME;
		    case CONTENTS:
			last->contents = value;
			last->contentslength = length;
			break;
		}
	}
};

class NodeCurl
{
	struct CurlOption
	{
		const char *name;
		int   value;
	};

	static CURLM * curlm;
	static int     running_handles;
	static bool    is_ref;
	static std::map< CURL*, NodeCurl* > curls;
	static int     count;
	static int     transfered;

	CURL  * curl;
	v8::Persistent<v8::Object> handle;

	bool  in_curlm;
	std::vector<curl_slist*> slists;
	std::map<int, std::string> strings;
	NodeCurlHttppost httppost;

	NodeCurl(v8::Handle<v8::Object> object)
	: in_curlm(false)
	{
		++count;
		v8::V8::AdjustAmountOfExternalAllocatedMemory(2*4096);
		object->SetPointerInInternalField(0, this);
		handle = v8::Persistent<v8::Object>::New(object);
		handle.MakeWeak(this, destructor);

		curl = curl_easy_init();
		if (!curl)
		{
			raise("curl_easy_init failed");
			return;
		}
		curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_function);
		curl_easy_setopt(curl, CURLOPT_WRITEDATA,     this);
		curls[curl] = this;
	}

	~NodeCurl()
	{
		--count;
		v8::V8::AdjustAmountOfExternalAllocatedMemory(-2*4096);
		if (curl)
		{
			if (in_curlm)
				curl_multi_remove_handle(curlm, curl);
			curl_easy_cleanup(curl);
			curls.erase(curl);
		}

		for (std::vector<curl_slist*>::iterator i = slists.begin(), e = slists.end(); i != e; ++i)
		{
			curl_slist * slist = *i;
			if (slist)
			{
				curl_slist_free_all(slist);
			}
		}
	}

	static void destructor(v8::Persistent<v8::Value> value, void *data)
	{
		v8::Handle<v8::Object> object = value->ToObject();
		NodeCurl * curl = (NodeCurl*)object->GetPointerFromInternalField(0);
		curl->close();
	}

	void close()
	{
		handle->SetPointerInInternalField(0, NULL);
		handle.Dispose();
		delete this;
	}

	static v8::Handle<v8::Value> close(const v8::Arguments & args)
	{
		NodeCurl * node_curl = unwrap(args.This());
		if (node_curl)
			node_curl->close();
		return args.This();
	}


	static NodeCurl * unwrap(v8::Handle<v8::Object> value)
	{
		return (NodeCurl*)value->GetPointerFromInternalField(0);
	}

	// curl write function mapping
	static size_t write_function(char *ptr, size_t size, size_t nmemb, void *userdata)
	{
		transfered += size * nmemb;
		NodeCurl *nodecurl = (NodeCurl*)userdata;
		return nodecurl->on_write(ptr, size * nmemb);
	}

	size_t on_write(char *data, size_t n)
	{
		static v8::Persistent<v8::String> SYM_ON_WRITE = v8::Persistent<v8::String>::New(v8::String::NewSymbol("on_write"));
		v8::Handle<v8::Value> cb = handle->Get(SYM_ON_WRITE);
		if (cb->IsFunction())
		{
			node::Buffer * buffer = node::Buffer::New(data, n);
			v8::Handle<v8::Value> argv[] = { buffer->handle_ };
			v8::Handle<v8::Value> rt = cb->ToObject()->CallAsFunction(handle, 1, argv);
			if (rt.IsEmpty())
				return 0;
			else
				return rt->Int32Value();
		}
		return n;
	}

	void on_end(CURLMsg *msg)
	{
		static v8::Persistent<v8::String> SYM_ON_END = v8::Persistent<v8::String>::New(v8::String::NewSymbol("on_end"));
		v8::Handle<v8::Value> cb = handle->Get(SYM_ON_END);
		if (cb->IsFunction())
		{
			v8::Handle<v8::Value> argv[] = {};
			cb->ToObject()->CallAsFunction(handle, 0, argv);
		}
	}

	void on_error(CURLMsg *msg)
	{
		static v8::Persistent<v8::String> SYM_ON_ERROR = v8::Persistent<v8::String>::New(v8::String::NewSymbol("on_error"));
		v8::Handle<v8::Value> cb = handle->Get(SYM_ON_ERROR);
		if (cb->IsFunction())
		{
			v8::Handle<v8::Value> argv[] = {v8::Exception::Error(v8::String::New(curl_easy_strerror(msg->data.result)))};
			cb->ToObject()->CallAsFunction(handle, 1, argv);
		}
	}

	// curl_easy_getinfo
	template<typename CType, typename JsClass>
	static v8::Handle<v8::Value> getinfo(const v8::Arguments &args)
	{
		CType result;
		NodeCurl * node_curl = unwrap(args.This());
		CURLINFO info = (CURLINFO)args[0]->Int32Value();
		CURLcode code = curl_easy_getinfo(node_curl->curl, info, &result);
		if (code != CURLE_OK)
		{
			return raise("curl_easy_getinfo failed", curl_easy_strerror(code));
		}
		return result ? JsClass::New(result) : v8::Null();
	}

	static v8::Handle<v8::Value> getinfo_int(const v8::Arguments & args)
	{
		return getinfo<int, v8::Integer>(args);
	}

	static v8::Handle<v8::Value> getinfo_str(const v8::Arguments & args)
	{
		return getinfo<char*,v8::String>(args);
	}

	static v8::Handle<v8::Value> getinfo_double(const v8::Arguments & args)
	{
		return getinfo<double, v8::Number>(args);
	}

	static v8::Handle<v8::Value> getinfo_slist(const v8::Arguments & args)
	{
		curl_slist * slist, * cur;
		NodeCurl* node_curl = unwrap(args.This());
		CURLINFO info = (CURLINFO)args[0]->Int32Value();
		CURLcode code = curl_easy_getinfo(node_curl->curl, info, &slist);
		if (code != CURLE_OK)
		{
			return raise("curl_easy_getinfo failed", curl_easy_strerror(code));
		}
		v8::Handle<v8::Array> array = v8::Array::New();
		if (slist)
		{
			cur = slist;
			while (cur)
			{
				array->Set(array->Length(), v8::String::New(cur->data));
				cur = cur->next;
			}
			curl_slist_free_all(slist);
		}
		return array;
	}

	// curl_easy_setopt
	template<typename T>
	v8::Handle<v8::Value> setopt(v8::Handle<v8::Value> option, T value)
	{
		return v8::Integer::New(
			curl_easy_setopt(
				curl,
				(CURLoption)option->Int32Value(),
				value
			)
		);
	}

	static v8::Handle<v8::Value> setopt_int(const v8::Arguments & args)
	{
		return unwrap(args.This())->setopt(args[0], args[1]->Int32Value());
	}

	static v8::Handle<v8::Value> setopt_str(const v8::Arguments & args)
	{
		// Create a string copy
		// https://github.com/jiangmiao/node-curl/issues/3
		NodeCurl   * node_curl = unwrap(args.This());
		int key = args[0]->Int32Value();
		v8::String::Utf8Value value(args[1]);
		int length = value.length();
		node_curl->strings[key] = std::string(*value, length);
		return unwrap(args.This())->setopt(args[0], node_curl->strings[key].c_str() );
	}

	static v8::Handle<v8::Value> setopt_slist(const v8::Arguments & args)
	{
		NodeCurl   * node_curl = unwrap(args.This());
		curl_slist * slist     = value_to_slist(args[1]);
		node_curl->slists.push_back(slist);
		return node_curl->setopt(args[0], slist);
	}

	static v8::Handle<v8::Value> setopt_httppost(const v8::Arguments & args)
	{
		NodeCurl * node_curl = unwrap(args.This());
		NodeCurlHttppost &httppost = node_curl->httppost;
		v8::Handle<v8::Array> rows = v8::Handle<v8::Array>::Cast(args[0]);
		httppost.reset();
		for (uint32_t i=0, len = rows->Length(); i<len; ++i)
		{
			v8::Handle<v8::Array> cols = v8::Handle<v8::Array>::Cast(rows->Get(i));
			uint32_t j=0, cols_len = cols->Length();
			httppost.append();
			while (j<cols_len)
			{
				int field = cols->Get(j++)->Int32Value();
				v8::Handle<v8::Object> buffer = cols->Get(j++)->ToObject();
				char *value = node::Buffer::Data(buffer);
				int length = node::Buffer::Length(buffer);
				httppost.set(field, value, length);
			}
		}
		curl_easy_setopt(node_curl->curl, CURLOPT_HTTPPOST, node_curl->httppost.first);
		return args.This();
	}

	static curl_slist * value_to_slist(v8::Handle<v8::Value> value)
	{
		curl_slist * slist = NULL;
		if (!value->IsArray())
		{
			slist = curl_slist_append(slist, *v8::String::Utf8Value(value));
		}
		else
		{
			v8::Handle<v8::Array> array = v8::Handle<v8::Array>::Cast(value);
			for (uint32_t i=0, len = array->Length(); i<len; ++i)
			{
				slist = curl_slist_append(slist, *v8::String::Utf8Value(array->Get(i)));
			}
		}
		return slist;
	}


	static v8::Handle<v8::Value> raise(const char *data, const char *reason = NULL)
	{
		static char message[256];
		const char *what = data;
		if (reason)
		{
			snprintf(message, sizeof(message), "%s: %s", data, reason);
			what = message;
		}
		return v8::ThrowException(v8::Exception::Error(v8::String::New(what)));
	}

	template<typename T>
	static void export_curl_options(T t, const char *group_name, CurlOption *options, int len)
	{
		v8::Handle<v8::Object> node_options = v8::Object::New();
		for (int i=0; i<len; ++i)
		{
			const CurlOption & option = options[i];
			node_options->Set(
				v8::String::NewSymbol(option.name),
				v8::Integer::New(option.value)
			);
		}
		t->Set(v8::String::NewSymbol(group_name), node_options);
	}

	// node js functions
	static v8::Handle<v8::Value> New(const v8::Arguments & args)
	{
		new NodeCurl(args.This());
		return args.This();
	}

	// int process()
	static v8::Handle<v8::Value> process(const v8::Arguments & args)
	{
		transfered = 0;
		if (running_handles > 0)
		{
			CURLMcode code;
			// remove select totally for timeout doesn't work properly
			do
			{
				code = curl_multi_perform(curlm, &running_handles);
			} while ( code == CURLM_CALL_MULTI_PERFORM );

			if (code != CURLM_OK)
			{
				return raise("curl_multi_perform failed", curl_multi_strerror(code));
			}

			int msgs = 0;
			CURLMsg * msg = NULL;
			while ( (msg = curl_multi_info_read(curlm, &msgs)) )
			{
				if (msg->msg == CURLMSG_DONE)
				{
					NodeCurl * curl = curls[msg->easy_handle];
					CURLMsg msg_copy = *msg;
					code = curl_multi_remove_handle(curlm, msg->easy_handle);
					curl->in_curlm = false;
					if (code != CURLM_OK)
					{
						return raise("curl_multi_remove_handle failed", curl_multi_strerror(code));
					}

					if (msg_copy.data.result == CURLE_OK)
						curl->on_end(&msg_copy);
					else
						curl->on_error(&msg_copy);
				}
			}
		}
		return v8::Integer::New(transfered + (int)(running_handles > 0));
	}

	// perform()
	static v8::Handle<v8::Value> perform(const v8::Arguments & args)
	{
		NodeCurl *curl = unwrap(args.This());
		if (!curl)
			return raise("curl is closed.");

		if (curl->in_curlm)
			return raise("curl session is running.");

		CURLMcode code = curl_multi_add_handle(curlm, curl->curl);
		if (code != CURLM_OK)
		{
			return raise("curl_multi_add_handle failed", curl_multi_strerror(code));
		}
		curl->in_curlm = true;
		++running_handles;

		return args.This();
	}

	static v8::Handle<v8::Value> get_count(const v8::Arguments & args )
	{
		return v8::Integer::New(count);
	}

    public:
	static v8::Handle<v8::Value> Initialize(v8::Handle<v8::Object> target)
	{
		// Initialize curl
		CURLcode code = curl_global_init(CURL_GLOBAL_ALL);
		if (code != CURLE_OK)
		{
			return raise("curl_global_init faield");
		}

		curlm = curl_multi_init();
		if (curlm == NULL)
		{
			return raise("curl_multi_init failed");
		}

		// Initialize node-curl
		v8::Handle<v8::FunctionTemplate> t = v8::FunctionTemplate::New(New);
		t->InstanceTemplate()->SetInternalFieldCount(1);

		// Set prototype methods
		NODE_SET_PROTOTYPE_METHOD(t , "perform_"      , perform);
		NODE_SET_PROTOTYPE_METHOD(t , "setopt_int_"   , setopt_int);
		NODE_SET_PROTOTYPE_METHOD(t , "setopt_str_"   , setopt_str);
		NODE_SET_PROTOTYPE_METHOD(t , "setopt_slist_" , setopt_slist);
		NODE_SET_PROTOTYPE_METHOD(t , "setopt_httppost_" , setopt_httppost);

		NODE_SET_PROTOTYPE_METHOD(t , "getinfo_int_"    , getinfo_int);
		NODE_SET_PROTOTYPE_METHOD(t , "getinfo_str_"    , getinfo_str);
		NODE_SET_PROTOTYPE_METHOD(t , "getinfo_double_" , getinfo_double);
		NODE_SET_PROTOTYPE_METHOD(t , "getinfo_slist_"  , getinfo_slist);

		NODE_SET_PROTOTYPE_METHOD(t, "close_", close);

		NODE_SET_METHOD(t , "process_"  , process);
		NODE_SET_METHOD(t , "get_count" , get_count);

		// Set curl constants
		#include "string_options.h"
		#include "integer_options.h"
		#include "string_infos.h"
		#include "integer_infos.h"
		#include "double_infos.h"

		#define X(name) {#name, CURLOPT_##name}
		CurlOption slist_options[] = {
			#if LIBCURL_VERSION_NUM >= 0x070a03
				X(HTTP200ALIASES),
			#endif

			#if LIBCURL_VERSION_NUM >= 0x071400
				X(MAIL_RCPT),
			#endif

			#if LIBCURL_VERSION_NUM >= 0x071503
				X(RESOLVE),
			#endif

			X(HTTPHEADER),
			X(QUOTE),
			X(POSTQUOTE),
			X(PREQUOTE),
			X(TELNETOPTIONS)
		};
		#undef X

		#define X(name) {#name, CURLINFO_##name}
		CurlOption slist_infos[] = {
			X(SSL_ENGINES),
			X(COOKIELIST)
		};

		#undef X
		#define X(name) {#name, NodeCurlHttppost::name}
		CurlOption httppost_options[] = {
			X(NAME),
			X(FILE),
			X(CONTENTS),
			X(TYPE)
		};
		#undef X

		NODE_CURL_EXPORT(string_options);
		NODE_CURL_EXPORT(integer_options);
		NODE_CURL_EXPORT(slist_options);

		NODE_CURL_EXPORT(string_infos);
		NODE_CURL_EXPORT(integer_infos);
		NODE_CURL_EXPORT(double_infos);
		NODE_CURL_EXPORT(slist_infos);

		NODE_CURL_EXPORT(httppost_options);

		target->Set(v8::String::NewSymbol("Curl"), t->GetFunction());
		return target;
	}
};

CURLM * NodeCurl::curlm = NULL;
int     NodeCurl::running_handles = 0;
bool    NodeCurl::is_ref = false;
std::map< CURL*, NodeCurl* > NodeCurl::curls;
int     NodeCurl::count = 0;
int     NodeCurl::transfered = 0;

#endif
