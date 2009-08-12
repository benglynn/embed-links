/*

About
=====

WORK IN PROGRESS

Replaces anchors pointing to certain media with embedded media. The media must be hosted with a 
proider that supports the oEmbed format http://www.oembed.com/, as the provider is queried via an 
ajax request to glean the necessary data.

This plugin was inspired by the jquery.oembed plugin http://plugins.jquery.com/project/jquery-oembed 
but does things differently:

 * The raw html returned by the provider is not used directly, html is consturcted from the 
   metadata.
 
 * Where Flash is required, SWFObject http://code.google.com/p/swfobject/ is used to perform Flash 
   detection and embed the media.

 * A function is available which will identify anchors pointing to supported media. (Alternatively, 
   oembed can be called on a jQuery object.)
 
 * The code passes the JSLint code quality tool http://www.jslint.com/
 
 This plugin was developed by benglynn
 
 */
 
/*jslint browser: true, rhino: true, newcap: true */
 /*globals jQuery, escape */
 

(function($) {

	/*
	Prototype subclassing utility TODO use function based inheritance to do this
	*/
	Function.prototype.extend = function(superclass) {
		var C = function() {};
		C.prototype = superclass.prototype;
		this.prototype = new C();	
	};
	
	// Default properties
	var defaultOptions = {
		maxWidth: 500,
		maxHeight: 400
	};
	
	// Abstract Provider class 
	function Provider(urlSchemeStart) {
		this.name = name;
		this.urlSchemeStart = urlSchemeStart;
	}
	
	// Retrun true if the provider handles the passed url, false otherwise
	Provider.prototype.handlesUrl = function(url) {
		return url.indexOf(this.urlSchemeStart) === 0;
	};
	
	// Embed media in place of an anchor
	Provider.prototype.embedLink = function(anchor) {
		var requestUrl = 'http://oohembed.com/oohembed/' +
			'?url=' + escape(anchor.attr('href')) + 
			'&format=json&maxWidth=' + defaultOptions.maxWidth + 
			'&maxHeight=' + defaultOptions.maxHeight + 
			'&callback=?';
		var provider = this;
		$.getJSON(requestUrl, function(data) {
			provider.onJson(data, anchor);
		});
	}
	
	// Handle data returned from a request
	Provider.prototype.onJson = function(data, anchor) {
		console.log('Abstract Provider onJson:');
		console.log(data);
	}
	
	// ImageProvider class
	function ImageProvider(urlSchemeStart) {
		Provider.call(this, urlSchemeStart);
	}
	
	ImageProvider.extend(Provider);
	
	ImageProvider.prototype.onJson = function(data, anchor) {
		anchor.replaceWith(
			'<img width="' + data.width + '" height="' + data.height + '" src="' + data.url + '"/>'
		);
	}
	
	// VideoProvider class
	function VideoProvider(urlSchemeStart) {
		Provider.call(this, urlSchemeStart);
	}
	
	VideoProvider.extend(Provider);
	
	// Provider instances
	var providers = [
		new VideoProvider('http://www.youtube.com/watch?v='),
		new ImageProvider('http://www.flickr.com/photos/')
	];
	
	// Match a provider to the passed url
	var getProvider = function(url) {
		for(var i = 0 ; i < providers.length ; i++) {
			if(providers[i].handlesUrl(url)) {
				return providers[i];
			}
		}
		return null;
	};
	
	/*
	Plugin, called with eg: $('a').embedLinks()
	*/
	$.fn.embedLinks = function(newOptions) {
	
		//var options = $.extend({}, defaultOptions, newOptions);
	
		return this.each(function() {
			if(this.nodeName === 'A') {
				var anchor = $(this);
				var provider = getProvider(anchor.attr('href'));
				if(provider !== null) {
					provider.embedLink(anchor);
				}
			}
		});
	
	};
	
	/*
	Function, called with $.emedLinks([options])
	*/
	$.embedLinks = function(options) {
		var cssPath = '';
		$.each(providers, function(i, provider) {
			cssPath += 'a[href^=' + provider.urlSchemeStart + ']';
			console.log(cssPath);
			if(i < providers.length - 1) {
				cssPath += ',';
			}
		});
		$(cssPath).embedLinks(options);
	};
})(jQuery);














