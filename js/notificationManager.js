var notificationManager = (function(global) {
	"use strict";

	function clear() {
		$(".notifications").empty();
	}

	function createMessageHTML(message, type) {
		const html = `
			<div class="ui message ${type}">
				<i class="close icon"></i>
				<div class="header">${message.header}</div>
				<p>${message.content}</p>
			</div>
		`;
		return html;
	}

	function show(message, type, append = false) {
		const html = createMessageHTML(message, type);
		if (append) {
			$(".notifications").prepend(html);
		} else {
			$(".notifications").empty().prepend(html);
		}
		// let typeList = "positive negative info success warning"
		// $(".notifications .ui.message").removeClass("hidden visible").addClass("visible");
		// $(".notifications .ui.message").removeClass(typeList).addClass(type);
		// $(".notifications .ui.message > .header").html(message.header);
		// $(".notifications .ui.message > p").html(message.content);
	}
 
  return {
		show: show,
		clear: clear
  }
})(this);

