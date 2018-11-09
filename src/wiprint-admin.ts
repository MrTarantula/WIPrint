import Context = require("VSS/Context");
import WITClient = require("TFS/WorkItemTracking/RestClient");
import Models = require("TFS/WorkItemTracking/Contracts");
import Dialogs = require("VSS/Controls/Dialogs");

const tfsContext = Context.getDefaultWebContext();
const dataService = VSS.getService(VSS.ServiceIds.ExtensionData);
const witClient = WITClient.getClient();

const allFields: Models.WorkItemTypeFieldInstance[] = [];
const selectedFields: Models.WorkItemTypeFieldInstance[] = [];

const types: Models.WorkItemType[] = [];
let key: string;
let dirty: boolean = false;
let activeType: Models.WorkItemType;
let activeSelected: Models.WorkItemTypeFieldInstance;
let activeAll: Models.WorkItemTypeFieldInstance;

function selectSelected(name: string): void {
  if (activeSelected) {
    $(`#selected-${activeSelected.name.sanitize()}`).removeClass("selected");
  }
  activeSelected = selectedFields.filter(field => {
    return field.name === name;
  })[0];
  $(`#selected-${name.sanitize()}`).addClass("selected");
}

function selectAll(name: string): void {
  if (activeAll) {
    $(`#all-${activeAll.name.sanitize()}`).removeClass("selected");
  }
  activeAll = allFields.filter(type => {
    return type.name === name;
  })[0];
  $(`#all-${name.sanitize()}`).addClass("selected");
}

makeClean();

witClient.getWorkItemTypes(tfsContext.project.name).then(witypes => {
  witypes.forEach(type => {
    types.push(type);
    $("#typesList").append(
      `<li id="type-${type.name.sanitize()}" class="ms-ListItem">` +
        (type.color
          ? `<span class="ms-ListItem-image" style="background-color: #${
              type.color
            }"></span>`
          : ``) +
        `<span class="ms-ListItem-primaryText">${type.name}</span>` +
        `<span class="ms-ListItem-secondaryText">${type.description}</span>` +
        `</li>`
    );
    $(`#type-${type.name.sanitize()}`).click(e => {
      refreshData(type.name);
    });
  });
});

$("#save").click(e => save(activeType.name));

$("#cancel").click(e => {
  makeClean();
  refreshData(activeType.name);
});

function save(name) {
  const saveFields = selectedFields.slice();
  makeClean();
  activeAll = null;
  activeSelected = null;
  dataService.then((service: IExtensionDataService) => {
    service.setValue(key, saveFields, { scopeType: "user" }).then(() => {
      refreshData(name);
    });
  });
}

function refreshData(name: string): void {
  if (dirty) {
    const dialog = Dialogs.show(Dialogs.ModalDialog, {
      title: "Unsaved Changes",
      content: $("<p/>")
        .addClass("confirmation-text")
        .html(`Do you want to save changes for <b>${activeType.name}</b>?`),
      buttons: {
        Save: () => {
          save(name);
          dialog.close();
        },
        No: () => {
          makeClean();
          activeAll = null;
          activeSelected = null;
          refreshData(name);
          dialog.close();
        },
        Cancel: () => {
          dialog.close();
        }
      }
    });
  } else {
    if (activeType) {
      $(`#type-${activeType.name.sanitize()}`).removeClass("selected");
    }
    activeType = types.filter(type => {
      return type.name === name;
    })[0];
    $(`#type-${name.sanitize()}`).addClass("selected");

    key = `wiprint-${activeType.name.sanitize()}`;

    $("#allList").html("");
    allFields.splice(0, allFields.length);
    $("#selectedList").html("");
    selectedFields.splice(0, selectedFields.length);

    dataService.then((service: IExtensionDataService) => {
      service
        .getValue(key, { scopeType: "user" })
        .then((data: Models.WorkItemTypeFieldInstance[]) => {
          if (data && data.length > 0) {
            data.forEach(field => {
              if (field !== null) {
                selectedFields.push(field);
              }
            });
            populateSelected();
          } else {
            $("#selectedList").append(
              `<li class="ms-ListItem">` +
                `<span class="ms-ListItem-secondaryText">No Saved Data</span>` +
                `</li>`
            );
          }
        })
        .then(() => {
          activeType.fieldInstances
            .filter(field => {
              for (let i = 0, len = selectedFields.length; i < len; i++) {
                if (field.referenceName === selectedFields[i].referenceName) {
                  return false;
                }
              }
              return true;
            })
            .forEach(field => {
              allFields.push(field);
            });
          populateAll();
        });
    });
  }
}

function makeDirty() {
  if (!dirty) {
    dirty = true;
    $("#save").prop("disabled", false);
    $("#cancel").prop("disabled", false);
  }
}

function makeClean() {
  dirty = false;
  $("#save").prop("disabled", true);
  $("#cancel").prop("disabled", true);
  activeAll = null;
  activeSelected = null;
}

function populateAll() {
  $("#allList").html("");
  allFields
    .sort((a, b) => (a.name > b.name ? 1 : -1))
    .forEach(field => {
      $("#allList").append(
        `<li id="all-${field.name.sanitize()}" class="ms-ListItem">` +
          `<span class="ms-ListItem-secondaryText">${field.name}</span>` +
          `</li>`
      );
      $(`#all-${field.name.sanitize()}`)
        .click(e => {
          selectAll(field.name);
        })
        .dblclick(e => {
          $("#push").click();
        });
    });
}

function populateSelected() {
  $("#selectedList").html("");
  selectedFields.forEach(field => {
    $("#selectedList").append(
      `<li id="selected-${field.name.sanitize()}" class="ms-ListItem">` +
        `<span class="ms-ListItem-secondaryText">${field.name}</span>` +
        `</li>`
    );
    $(`#selected-${field.name.sanitize()}`)
      .click(e => {
        selectSelected(field.name);
      })
      .dblclick(e => {
        $("#pop").click();
      });
  });
}

$("#push").click(e => {
  if (activeAll) {
    const allIndex = allFields.indexOf(activeAll);
    const selectedIndex =
      selectedFields.indexOf(activeSelected) === -1
        ? selectedFields.length - 1
        : selectedFields.indexOf(activeSelected);
    allFields.splice(allIndex, 1);
    selectedFields.splice(selectedIndex + 1, 0, activeAll);
    populateAll();
    if (allFields.length > 0) {
      $(
        `#all-${allFields[
          allFields[allIndex] ? allIndex : allIndex - 1
        ].name.sanitize()}`
      ).click();
      scroll(
        $(
          `#all-${allFields[
            allFields[allIndex] ? allIndex : allIndex - 1
          ].name.sanitize()}`
        )
      );
    } else {
      activeAll = null;
    }
    populateSelected();
    $(
      `#selected-${selectedFields[
        selectedFields[selectedIndex + 1] ? selectedIndex + 1 : selectedIndex
      ].name.sanitize()}`
    ).click();
    scroll(
      $(
        `#selected-${selectedFields[
          selectedFields[selectedIndex + 1] ? selectedIndex + 1 : selectedIndex
        ].name.sanitize()}`
      )
    );
    makeDirty();
  }
});

$("#pop").click(e => {
  if (activeSelected) {
    const selectedIndex = selectedFields.indexOf(activeSelected);

    selectedFields.splice(selectedIndex, 1);
    allFields.push(activeSelected);
    populateSelected();
    populateAll();
    $(
      `#all-${allFields[allFields.indexOf(activeSelected)].name.sanitize()}`
    ).click();
    scroll(
      $(`#all-${allFields[allFields.indexOf(activeSelected)].name.sanitize()}`)
    );
    if (selectedFields.length > 0) {
      $(
        `#selected-${selectedFields[
          selectedFields[selectedIndex] ? selectedIndex : selectedIndex - 1
        ].name.sanitize()}`
      ).click();
      scroll(
        $(
          `#selected-${selectedFields[
            selectedFields[selectedIndex] ? selectedIndex : selectedIndex - 1
          ].name.sanitize()}`
        )
      );
    } else {
      activeSelected = null;
    }
    makeDirty();
  }
});

$("#top").click(e => {
  if (activeSelected && selectedFields.indexOf(activeSelected) > 0) {
    selectedFields.splice(selectedFields.indexOf(activeSelected), 1);
    selectedFields.unshift(activeSelected);
    populateSelected();
    $(`#selected-${selectedFields[0].name.sanitize()}`).click();
    scroll($(`#selected-${selectedFields[0].name.sanitize()}`));
    makeDirty();
  }
});

$("#bottom").click(e => {
  if (
    activeSelected &&
    selectedFields.indexOf(activeSelected) < selectedFields.length
  ) {
    selectedFields.splice(selectedFields.indexOf(activeSelected), 1);
    selectedFields.push(activeSelected);
    populateSelected();
    $(
      `#selected-${selectedFields[selectedFields.length - 1].name.sanitize()}`
    ).click();
    scroll(
      $(
        `#selected-${selectedFields[selectedFields.length - 1].name.sanitize()}`
      )
    );
    makeDirty();
  }
});

$("#up").click(e => {
  if (activeSelected && selectedFields.indexOf(activeSelected) > 0) {
    const index = selectedFields.indexOf(activeSelected);
    selectedFields.splice(index, 1);
    selectedFields.splice(index - 1, 0, activeSelected);
    populateSelected();
    $(`#selected-${selectedFields[index - 1].name.sanitize()}`).click();
    scroll($(`#selected-${selectedFields[index - 1].name.sanitize()}`));
    makeDirty();
  }
});

$("#down").click(e => {
  if (
    activeSelected &&
    selectedFields.indexOf(activeSelected) < selectedFields.length
  ) {
    const index = selectedFields.indexOf(activeSelected);
    selectedFields.splice(index, 1);
    selectedFields.splice(index + 1, 0, activeSelected);
    populateSelected();
    $(
      `#selected-${selectedFields[
        selectedFields[index + 1] ? index + 1 : index
      ].name.sanitize()}`
    ).click();
    scroll(
      $(
        `#selected-${selectedFields[
          selectedFields[index + 1] ? index + 1 : index
        ].name.sanitize()}`
      )
    );
    makeDirty();
  }
});

// Utilities
declare global {
  interface String {
    sanitize(): string;
  }
}

String.prototype.sanitize = function(this: string) {
  return this.replace(/\s/g, "-").replace(/[^a-z0-9\-]/gi, "");
};

function scroll(child: JQuery): void {
  const parent = child.parent();

  parent.scrollTop(
    child.offset().top - parent.offset().top + parent.scrollTop() - 296
  );
}
