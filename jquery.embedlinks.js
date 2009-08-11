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
 
 /*globals jQuery */
 

(function($) {

	/*
	Private
	*/
	
	function Provider(name, urlSchemeStart) {
		this.name = name;
		this.urlSchemeStart = urlSchemeStart;
	}
	// Retrun true if the providerhandles the passed url, false otherwise
	Provider.prototype.handlesUrl = function(url) {
		return url.indexOf(this.urlSchemeStart) === 0;
	};
	// Return the ajax request url
	Provider.prototype.convertToRequest = function(url) {
		return 'http://oohembed.com/oohembed/?url=' + escape(url) + '&format=json&maxWidth=' + defaultOptions.maxWidth + '&maxHeight=' + defaultOptions.maxHeight;
	}
	
	// Provider instances
	var providers = [
		new Provider('YouTube', 'http://www.youtube.com/watch?v='),
		new Provider('flickr', 'http://www.flickr.com/photos/')
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
	
	// Default properties
	var defaultOptions = {
		maxWidth: 500,
		maxHeight: 400
	};
	
	/*
	Private methods
	*/
	
	/*
	Plugin, called with eg: $('[a]').embedLinks([options])
	*/
	$.fn.embedLinks = function(newOptions) {
	
		var options = $.extend({}, defaultOptions, newOptions);
	
		return this.each(function() {
			if(this.nodeName === 'A') {
				var anchor = $(this);
				var provider = getProvider(anchor.attr('href'))
				if(provider !== null) {				
					anchor.css('border', '5px solid pink');
					// Get the request for this anchor's media's JSON, and add '&callback=?' to make
					//a JSONP request
					var request = provider.convertToRequest(anchor.attr('href')) + '&callback=?';
					$.getJSON(request, function(data) {
						console.log(data);
					});
					
				}
			}
		});
	
	};
	
	/*
	Function, called with $.emedLinks([options])
	*/
	$.embedLinks = function(newOptions) {
	
		var options = $.extend({}, defaultOptions, newOptions);
	
	};
	
	

})(jQuery);














