#ifndef NODE_CURL_NOHE_CURL_H
#define NODE_CURL_NOHE_CURL_H


#include <unistd.h>
#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <curl/curl.h>
#include <map>

#define NODE_CURL_OPTION_NX(name, value) {#name, value}
#define NODE_CURL_OPTION(name) NODE_CURL_OPTION_NX(name , CURLOPT_##name)
#define NODE_CURL_EXPORT(name) export_curl_options(t, #name, name, sizeof(name) / sizeof(CurlOption));



class NodeCurl
{
	struct CurlOption {
		const char *name;
		int   value;
	};

	static CURLM * curlm;
	static int     running_handles;
	static bool    is_ref;
	static std::map< CURL*, NodeCurl* > curls;

	CURL  * curl;
	v8::Persistent<v8::Object> handle;
	NodeCurl(v8::Handle<v8::Object> object)
	{
		object->SetPointerInInternalField(0, this);
		handle = v8::Persistent<v8::Object>::New(object);
		handle.MakeWeak(this, destructor);

		curl = curl_easy_init();
		if (!curl)
		{
			raise("curl_easy_init failed");
		}
		curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_function);
		curl_easy_setopt(curl, CURLOPT_WRITEDATA,     this);
		curls[curl] = this;
	}

	~NodeCurl()
	{
		if (curl)
		{
			curl_multi_remove_handle(curlm, curl);
			curl_easy_cleanup(curl);
			curls.erase(curl);
		}
	}

	static void destructor(v8::Persistent<v8::Value> object, void *data)
	{
		NodeCurl * curl = (NodeCurl*)object->ToObject()->GetPointerFromInternalField(0);
		delete curl;
	}

	void close()
	{
		handle->SetPointerInInternalField(0, NULL);
		handle.Dispose();
		delete this;
	}

	static NodeCurl * unwrap(v8::Handle<v8::Object> value)
	{
		return (NodeCurl*)value->GetPointerFromInternalField(0);
	}

	// curl write function mapping
	static size_t write_function(char *ptr, size_t size, size_t nmemb, void *userdata)
	{
		NodeCurl *nodecurl = (NodeCurl*)userdata;
		return nodecurl->on_write(ptr, size * nmemb);
	}

	size_t on_write(char *data, size_t n)
	{
		v8::HandleScope scope;
		static auto SYM_ON_WRITE = v8::Persistent<v8::String>::New(v8::String::NewSymbol("on_write"));
		auto cb = handle->Get(SYM_ON_WRITE);
		if (cb->IsFunction())
		{
			auto buffer = node::Buffer::New(data, n);
			v8::Handle<v8::Value> argv[] = { buffer->handle_ };
			cb->ToObject()->CallAsFunction(handle, 1, argv);
		}
		return n;
	}

	void on_end(CURLMsg *msg)
	{
		static auto SYM_ON_END = v8::Persistent<v8::String>::New(v8::String::NewSymbol("on_end"));
		auto cb = handle->Get(SYM_ON_END);
		if (cb->IsFunction())
		{
			v8::Handle<v8::Value> argv[] = {};
			cb->ToObject()->CallAsFunction(handle, 0, argv);
		}
	}

	void on_error(CURLMsg *msg)
	{
		static auto SYM_ON_ERROR = v8::Persistent<v8::String>::New(v8::String::NewSymbol("on_error"));
		auto cb = handle->Get(SYM_ON_ERROR);
		if (cb->IsFunction())
		{
			v8::Handle<v8::Value> argv[] = {v8::Exception::Error(v8::String::New(curl_easy_strerror(msg->data.result)))};
			cb->ToObject()->CallAsFunction(handle, 1, argv);
		}
	}

	// curl_easy_getinfo
	template<typename T, typename S>
	static v8::Handle<v8::Value> getinfo(const v8::Arguments &args)
	{
		T result;
		NodeCurl * node_curl = unwrap(args.This());
		CURLINFO info = (CURLINFO)args[0]->Int32Value();
		CURLcode code = curl_easy_getinfo(node_curl->curl, info, &result);
		if (code != CURLE_OK)
		{
			return raise("curl_easy_getinfo failed", curl_easy_strerror(code));
		}
		return S::New(result);
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
		return unwrap(args.This())->setopt(args[0], *v8::String::Utf8Value(args[1]) );
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
		auto node_options = v8::Object::New();
		for (int i=0; i<len; ++i)
		{
			const auto & option = options[i];
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
		if (running_handles > 0)
		{
			CURLMcode code;
			int max_fd = FD_SETSIZE;
			fd_set read_fds;
			fd_set write_fds;
			fd_set error_fds;
			FD_ZERO(&read_fds);
			FD_ZERO(&write_fds);
			FD_ZERO(&error_fds);
			// use select because of libuv didn't support sockfd well
			code = curl_multi_fdset(curlm, &read_fds, &write_fds, &error_fds, &max_fd);
			if (code != CURLM_OK)
			{
				return raise("curl_multi_fdset failed", curl_multi_strerror(code));
			}
			printf("maxfd returns %d\n", max_fd);
			if (max_fd > 0)
			{
				timeval tv = {0};
				int n = select(max_fd+1, &read_fds, &write_fds, &error_fds, &tv);
				printf("selecting returns %d\n", n);
				if (n == 0)
				{
					return v8::Integer::New(running_handles);
				}
			}

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
				printf("msgs: %d, running_handles: %d\n", msgs, running_handles);
				if (msg->msg == CURLMSG_DONE)
				{
					auto curl = curls[msg->easy_handle];
					if (msg->data.result == CURLE_OK)
						curl->on_end(msg);
					else
						curl->on_error(msg);
					code = curl_multi_remove_handle(curlm, msg->easy_handle);
					if (code != CURLM_OK)
					{
						return raise("curl_multi_remove_handle failed", curl_multi_strerror(code));
					}
				}
				puts("done.");
			}
		}
		return v8::Integer::New(running_handles);
	}

	// perform()
	static v8::Handle<v8::Value> perform(const v8::Arguments & args)
	{
		NodeCurl *curl = unwrap(args.This());
		CURLMcode code = curl_multi_add_handle(curlm, curl->curl);
		if (code != CURLM_OK)
		{
			return raise("curl_multi_add_handle failed", curl_multi_strerror(code));
		}
		++running_handles;
		return args.This();
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
		auto t = v8::FunctionTemplate::New(New);
		t->InstanceTemplate()->SetInternalFieldCount(1);

		// Set prototype methods
		NODE_SET_PROTOTYPE_METHOD(t, "perform_", perform);
		NODE_SET_PROTOTYPE_METHOD(t, "setopt_int_", setopt_int);
		NODE_SET_PROTOTYPE_METHOD(t, "setopt_str_", setopt_str);

		NODE_SET_PROTOTYPE_METHOD(t, "getinfo_int_", getinfo_int);
		NODE_SET_PROTOTYPE_METHOD(t, "getinfo_str_", getinfo_str);
		NODE_SET_PROTOTYPE_METHOD(t, "getinfo_double_", getinfo_double);

		NODE_SET_METHOD(t, "process_", process);

		// Set curl constants 
		#include "string_options.h"
		#include "integer_options.h"
		#include "string_infos.h"
		#include "integer_infos.h"
		#include "double_infos.h"

		NODE_CURL_EXPORT(string_options);
		NODE_CURL_EXPORT(integer_options);
		NODE_CURL_EXPORT(string_infos);
		NODE_CURL_EXPORT(integer_infos);
		NODE_CURL_EXPORT(double_infos);

		target->Set(v8::String::NewSymbol("Curl"), t->GetFunction());
		return target;
	}
};

CURLM * NodeCurl::curlm = NULL;
int     NodeCurl::running_handles = 0;
bool    NodeCurl::is_ref = false;
std::map< CURL*, NodeCurl* > NodeCurl::curls;

#endif
