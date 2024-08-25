import '@logseq/libs';

// TODO: clean up and comment this logic for filtering results
// TODO: create a new page for the exported refs and print blocks there
// TODO: nest child blocks, and confirm that child blocks can be nested recursively
//TODO: research https://github.com/stdword/logseq13-missing-commands/blob/main/src/commands/index.ts

//Inputs 5 numbered blocks when called
async function referencesToText(e) {
  const currentPage = await logseq.Editor.getCurrentPage();
  console.log('currentPage', currentPage);
  if (!!!currentPage) {
    return;
  }

  const [includeFilter, excludeFilter] = returnTrueAndFalseFilters(currentPage);
  console.log('includeFilter', includeFilter);
  console.log('excludeFilter', excludeFilter);
  const refs = await logseq.Editor.getPageLinkedReferences(currentPage.name);
  //strip weird pages out of this. everything should be an array where [0] is the page and [1] is the blocks
  console.log('refs', refs);
  //sorts by the journalDay property otherwise sort to bottom for non journal pages
  const sortedRefs = refs.sort((a, b) => {
    const journalDayA = a['0']?.journalDay ?? -1;
    const journalDayB = b['0']?.journalDay ?? -1;

    return journalDayA - journalDayB;
  });

  console.log('sorted data', sortedRefs);

  const filteredData = sortedRefs.filter((item) => {
    const itemName = item[0].name || ''; // Extract the name from the sortedData

    if (excludeFilter.includes(itemName)) {
      return false; // Exclude items with names in falseFilters
    }
    if (includeFilter.length === 0) {
      return true; // If no true filters, include all
    }
    return includeFilter.includes(itemName); // Include items with names in trueFilters
  });

  console.log('filtered Data', filteredData);

  filteredData.forEach(async (note) => {
    const block = await logseq.Editor.appendBlockInPage(currentPage.name, note[0].originalName);
    //I will have to make a custom version of this method that properly nests the blocks
    await logseq.Editor.insertBatchBlock(block.uuid, note[1], {
      sibling: false,
    });

    const childBlocks = note[1];
    console.log('childBlocks', childBlocks);
    const childBlockIds = childBlocks.map((childBlock) => childBlock.id);

    childBlocks.forEach(async (childBlock) => {
      if (childBlock.parent.id !== block.id) {
        if (!childBlockIds.includes(childBlock.parent.id)) {
          console.log('skipping', childBlock);
          return; // Skip childBlock if parent.id is not included in childBlockIds
        }
        console.log('moving', childBlock);
        const parent = childBlocks.find((item) => item.id === childBlock.parent.id);
        await logseq.Editor.insertBlock(parent.uuid, childBlock.content, {
          sibling: false,
          properties: childBlock.properties,
        });
      }
    });
  });
}

function returnTrueAndFalseFilters(page) {
  const trueFilters = [];
  const falseFilters = [];

  const hasFilters = !!page.properties?.filters;
  console.log('hasFilters', hasFilters);
  if (!hasFilters) {
    return [trueFilters, falseFilters];
  }
  // Extract the filters property
  const filters = page.properties?.filters || '{}';
  console.log('filters', filters);
  const correctedString = correctJsonString(filters);
  console.log('corrected string', correctedString);

  //need to double parse because the string is double stringified above
  // see: https://stackoverflow.com/questions/42494823/json-parse-returns-string-instead-of-object
  const filtersObject = JSON.parse(correctedString);

  console.log('object', filtersObject);
  console.log('object type', typeof filtersObject);
  // console.log('object properties', Object.entries(filtersObject));

  for (const [name, value] of Object.entries(filtersObject)) {
    if (value) {
      trueFilters.push(name);
    } else {
      falseFilters.push(name);
    }
  }

  return [trueFilters, falseFilters];
}

function correctJsonString(jsonStr) {
  // This regex finds patterns where a key is not followed by a colon
  const correctedStr = jsonStr
    // Step 1: Add missing colons after keys
    .replace(/"(.*?)"(\s+)([^\{\}\[\],\s])/g, '"$1": $3')
    // Step 2: Handle values that are not properly formatted
    .replace(/":\s*([^\{\}\[\],\s]+)(?=\s*[\}\],])/g, '": $1')
    // Step 3: Ensure boolean and null values are correctly formatted
    .replace(/":\s*(true|false|null)(?=\s*[\}\],])/g, '": $1');

  return correctedStr;
}

const main = async () => {
  console.log('PageRefToText loaded!');
  logseq.Editor.registerSlashCommand('ref to text', async (e) => {
    referencesToText(e);
  });
};

logseq.ready(main).catch(console.error);
