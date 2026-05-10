var items = Zotero.getActiveZoteroPane().getSelectedItems();
var jTitlesFile = '/Users/mshevchuk/Documents/offline/workshop/zotero/journal_titles.tsv'
var data = await Zotero.File.getContentsAsync(jTitlesFile);

data = data.split('\n');
var keys = data[0].split('\t');
let jTitles = {};
for (var i=1; i<data.length; i++) {
    values = data[i].split('\t');
    dict = {};
    for (var j=0; j<keys.length; j++) {
        dict[keys[j]] = values[j];
    }
    data[i] = dict;
}

for (item of items) {
    title = item.getField('publicationTitle');
    journal = data.find(journal => journal.title === title);
    let extra = item.getField('extra').split('\n');
    let jcode = 'jcode: ' + journal.abbreviation;
    let updated = false;
    for (i=0; i<extra.length; i++) {
        if (extra[i].match('^jcode:')) {
            extra[i] = jcode;
            updated = true
        }
    }
    if (!updated) extra.push(jcode);
    extra = extra.join("\n");
    item.setField('extra', extra);
    await item.saveTx()
}
