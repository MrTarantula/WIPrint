require("amd-loader");

var assert = require("assert");
var selector = require("../dist/selector");

var testArray = [
  {
    key: "a",
    val: "aa"
  },
  {
    key: "b",
    val: "bb"
  },
  {
    key: "c",
    val: "cc"
  },
  {
    key: "d",
    val: "dd"
  },
  {
    key: "e",
    val: "ee"
  },
  {
    key: "f",
    val: "ff"
  }
];

describe("Selector", function() {
  describe("Creation", function() {
    it("should create a new selector", function() {
      var sel = new selector.Selector(testArray, "key");
      assert.equal(sel.items.length, 6);
    });

    it("should create new SelectorItems with index as value", function() {
      var sel = new selector.Selector(testArray, "key");
      assert.equal(sel.items[0].index, "a");
      assert.equal(sel.items[0].value, "a");
    });

    it("should create new SelectorItems with value as value", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      assert.equal(sel.items[0].index, "a");
      assert.equal(sel.items[0].value, "aa");
    });
  });
  describe("Selection", function() {
    it("should select the first item", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(0);
      assert.equal(sel.selected[0], 0);
    });

    it("should select the first item, then third", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(0);
      sel.select(2);
      assert.equal(sel.selected[0], 2);
    });

    it("should select the first and third items with ctrl", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(0);
      sel.select(2, true);
      assert.equal(sel.selected[0], 0);
      assert.equal(sel.selected[1], 2);
    });

    it("should select the first, second, and third items with shift", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(0);
      sel.select(2, null, true);
      assert.equal(sel.selected[0], 0);
      assert.equal(sel.selected[1], 1);
      assert.equal(sel.selected[2], 2);
    });
  });

  describe("Up", function() {
    it("should move one item up", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.up();
      assert.equal(sel.items[1].index, testArray[2].key);
    });

    it("should not move one item above bounds", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(0);
      sel.up();
      assert.equal(sel.items[0].index, testArray[0].key);
    });

    it("should not move one item above bounds and maintain selected item", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(0);
      sel.up();
      assert.equal(sel.items[sel.selected[0]].index, testArray[0].key);
    });

    it("should maintain selected item when moving one item up", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.up();
      assert.equal(sel.items[sel.selected[0]].index, testArray[2].key);
    });

    it("should move two sequential items up", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.select(3, true);
      sel.up();
      assert.equal(sel.items[1].index, testArray[2].key);
      assert.equal(sel.items[2].index, testArray[3].key);
    });

    it("should maintain selected items when moving two sequential items up", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.select(3, true);
      sel.up();
      assert.equal(sel.items[sel.selected[0]].index, testArray[2].key);
      assert.equal(sel.items[sel.selected[1]].index, testArray[3].key);
    });

    it("should move two non-sequential items up", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.select(4, true);
      sel.up();
      assert.equal(sel.items[1].index, testArray[2].key);
      assert.equal(sel.items[3].index, testArray[4].key);
    });

    it("should maintain selected items when moving two non-sequential items up", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.select(4, true);
      sel.up();
      assert.equal(sel.items[sel.selected[0]].index, testArray[2].key);
      assert.equal(sel.items[sel.selected[1]].index, testArray[4].key);
    });
  });

  describe("Down", function() {
    it("should move one item down", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.down();
      assert.equal(sel.items[3].index, testArray[2].key);
    });

    it("should not move one item below bounds", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      var len = sel.length - 1;
      sel.select(len);
      sel.down();
      assert.equal(sel.items[len].index, testArray[len].key);
    });

    it("should not move one item below bounds and maintain selected item", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      var len = sel.length - 1;
      sel.select(len);
      sel.down();
      assert.equal(sel.items[len].index, testArray[len].key);
    });

    it("should maintain selected item when moving one item down", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.down();
      assert.equal(sel.items[sel.selected[0]].index, testArray[2].key);
    });

    it("should move two sequential items down", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.select(3, true);
      sel.down();
      assert.equal(sel.items[3].index, testArray[2].key);
      assert.equal(sel.items[4].index, testArray[3].key);
    });

    it("should maintain selected items when moving two sequential items down", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.select(3, true);
      sel.down();
      assert.equal(sel.items[sel.selected[0]].index, testArray[2].key);
      assert.equal(sel.items[sel.selected[1]].index, testArray[3].key);
    });

    it("should move two non-sequential items down", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.select(4, true);
      sel.down();
      assert.equal(sel.items[3].index, testArray[2].key);
      assert.equal(sel.items[5].index, testArray[4].key);
    });

    it("should maintain selected items when moving two non-sequential items down", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(2);
      sel.select(4, true);
      sel.up();
      assert.equal(sel.items[sel.selected[0]].index, testArray[2].key);
      assert.equal(sel.items[sel.selected[1]].index, testArray[4].key);
    });
  });

  describe("Top", function() {
    it("should move one item to the top", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      sel.select(4);
      sel.top();
      assert.equal(sel.items[0].index, testArray[4].key);
    });

    it("should move two sequential items to the top", function() {
      var sel = new selector.Selector(testArray, "key", "val");
    });

    it("should move two sequential items to the top", function() {
      var sel = new selector.Selector(testArray, "key", "val");
    });

    it("should move two non-sequential items to the top", function() {
      var sel = new selector.Selector(testArray, "key", "val");
    });
  });

  describe("Bottom", function() {
    it("should move one item to the bottom", function() {});

    it("should move two sequential items to the bottom", function() {});

    it("should move two sequential items to the bottom", function() {});

    it("should move two non-sequential items to the bottom", function() {});
  });

  describe("Add", function() {
    it("should add an item to empty selector", function() {
      var sel = new selector.Selector(testArray, "key", "val");
      var newItem = {};
    });

    it("should add an item to empty selector and select it", function() {});

    it("should add an item to the bottom if nothing selected", function() {});

    it("should add an item to the bottom if nothing selected and select the added item", function() {});

    it("should add an item below the selected item", function() {});

    it("should add an item below the selected item and select only the added item", function() {});

    it("should add an item below the highest selected item", function() {});

    it("should add an item below the highest selected item and select only the added item", function() {});

    it("should add multiple items to an empty selector", function() {});

    it("should add multiple items to an empty selector and select them", function() {});

    it("should add multiple items to the bottom if nothing selected", function() {});

    it("should add multiple items to the bottom if nothing selected and select only the added items", function() {});

    it("should add multiple items below the selected item", function() {});

    it("should add multiple items below the selected item and select only the added items", function() {});

    it("should add multiple items below the highest selected item", function() {});

    it("should add multiple items below the highest selected item and select only the added items", function() {});
  });
  describe("Remove", function() {
    it("should remove an item", function() {});

    it("should remove an item and select the item at the removed item's previous index", function() {});

    it("should remove the bottom item and select the new bottom item", function() {});

    it("should remove the last remaining item and select nothing", function() {});

    it("should remove multiple items", function() {});

    it("should remove multiple items and select the item at the highest removed item's index", function() {});
  });
});
