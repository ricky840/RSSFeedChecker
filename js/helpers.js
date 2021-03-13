function shortenFeedID(id) {
  return id.split("-")[4];
}

function isValidDate(date) {
  return (date instanceof Date && !isNaN(date));
}

function getCurrentDateTime() {
	const now = new Date(); 
	return `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()} (Local Time)`;	
}

String.prototype.trimToLength = function(m) {
  return (this.length > m) 
    ? jQuery.trim(this).substring(0, m).split(" ").slice(0, -1).join(" ") + "..."
    : this;
};