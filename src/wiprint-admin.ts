import Context = require("VSS/Context");
import WITClient = require("TFS/WorkItemTracking/RestClient");
import Models = require("TFS/WorkItemTracking/Contracts");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");

import { FieldsSelector, Selector, SelectorItem } from "./selector";

const tfsContext = Context.getDefaultWebContext();
const dataService = VSS.getService(VSS.ServiceIds.ExtensionData);
const witClient = WITClient.getClient();
const types: Models.WorkItemType[] = [];

let activeType: Models.WorkItemType;
let selector: FieldsSelector;

let LHS: Models.WorkItemTypeFieldInstance[] = [];
let RHS: Models.WorkItemTypeFieldInstance[] = [];

// const key = `wiprint-${this.workItemType.name.sanitize()}`;

witClient.getWorkItemTypes(tfsContext.project.name).then((witypes) => {
    witypes.forEach((type) => {
        types.push(type);
        $("#typesList").append(`<li id="type-${type.name.sanitize()}" class="ms-ListItem">` +
            (type.color ?
                `<span class="ms-ListItem-image" style="background-color: #${type.color}"></span>` :
                ``) +
            `<span class="ms-ListItem-primaryText">${type.name}</span>` +
            `<span class="ms-ListItem-secondaryText">${type.description}</span>` +
            `</li>`);
        $(`#type-${type.name.sanitize()}`).click((e) => {
            refreshData(type.name);
        });
    });
});

function refreshData(name: string): void {
    if (selector && selector.dirty) {
        const dialog = Dialogs.show(Dialogs.ModalDialog, {
            title: "Unsaved Changes",
            content: $("<p/>").addClass("confirmation-text").html(`Do you want to save changes for <b>${activeType.name}</b>?`),
            buttons: {
                "Save": () => {
                    save(name);
                    dialog.close();
                },
                "No": () => {
                    checkDirty();
                    refreshData(name);
                    dialog.close();
                },
                "Cancel": () => {
                    dialog.close();
                }
            }
        });
    } else {
        if (activeType) {
            $(`#type-${activeType.name.sanitize()}`).removeClass("selected");
        }
        activeType = types.filter((type) => {
            return type.name === name;
        })[0];
        $(`#type-${name.sanitize()}`).addClass("selected");

        dataService.then((service: IExtensionDataService) => {
            service.getValue(`wiprint-${activeType.name.sanitize()}`, { scopeType: "user" })
                .then((data: Models.WorkItemTypeFieldInstance[]) => {
                    if (data && data.length > 0) {
                        data.forEach((field) => {
                            RHS.push(field);
                        });
                    } else {
                        RHS.push({
                            alwaysRequired: false,
                            field: null,
                            helpText: "",
                            name: "No Saved Data",
                            referenceName: "No Saved Data",
                            url: ""
                        } as Models.WorkItemTypeFieldInstance);
                    }
                })
                .then(() => {
                    activeType.fieldInstances
                        .filter((field) => {
                            for (let i = 0, len = RHS.length; i < len; i++) {
                                if (field.name === RHS[i].name) {
                                    return false;
                                }
                            }
                            return true;
                        })
                        .sort((a, b) => a.name > b.name ? 1 : -1)
                        .forEach((field) => {
                            LHS.push(field);
                        });

                    selector = new FieldsSelector(LHS, RHS, "name");
                    populate();
                    populatePrinted();
                });
        });
    }
}

function save(name) {
    // const saveFields = selector.allRHS.map((field) => {
    //     return field.object as Models.WorkItemTypeFieldInstance;
    // });
    // checkDirty();
    // dataService.then((service: IExtensionDataService) => {
    //     service.setValue(`wiprint-${selector.workItemType.name.sanitize()}`, saveFields, { scopeType: "user" }).then(() => {
    //         refreshData(name);
    //     });
    // });
}

function checkDirty() {
    $("#save").prop("disabled", !selector.dirty);
    $("#cancel").prop("disabled", !selector.dirty);
}

function scroll(list: JQuery, index: number) {
    list.scrollTop(index * 37 - 333);
}

function populate() {
    $("#allList").html("");

    selector.LHS.sort();
    selector.LHS.items.forEach((field) => {
        $("#allList").append(`<li id="all-${field.value.sanitize()}" class="ms-ListItem">` +
            `<span class="ms-ListItem-secondaryText">${field.value}</span>` +
            `</li>`);

        $(`#all-${field.value.sanitize()}`).click((e) => {
            selector.click("all", selector.LHS.items.indexOf(field), e.ctrlKey, e.shiftKey);
            populate();
        }).dblclick((e) => {
            $("#push").click();
            populate();
        });
    });

    selector.LHS.selected.forEach((s) => {
        $(`#all-${selector.LHS.items[s].value.sanitize()}`).addClass("selected");
    });
}

function populatePrinted() {
    $("#selectedList").html("");
    selector.RHS.items.forEach((field) => {
        $("#selectedList").append(`<li id="selected-${field.value.sanitize()}" class="ms-ListItem">` +
            `<span class="ms-ListItem-secondaryText">${field.value}</span>` +
            `</li>`);
        $(`#selected-${field.value.sanitize()}`).click((e) => {
            selector.click("print", selector.RHS.items.indexOf(field), e.ctrlKey, e.shiftKey);
            populatePrinted();
        }).dblclick((e) => {
            $("#pop").click();
            populatePrinted();
        });
    });

    selector.RHS.selected.forEach((s) => {
        $(`#selected-${selector.RHS.items[s].value.sanitize()}`).addClass("selected");
    });
}

$("#save").click((e) => save(activeType.name));

$("#cancel").click((e) => {
    checkDirty();
    refreshData(activeType.name);
});

$("#push").click((e) => {
    selector.push();
    populate();
    populatePrinted();
    scroll($("#allList"), selector.LHS.selected[0]);
    scroll($("#selectedList"), selector.RHS.selected[0]);
    checkDirty();

});

$("#pop").click((e) => {
    selector.pop();
    populate();
    populatePrinted();
    scroll($("#allList"), selector.LHS.selected[0]);
    scroll($("#selectedList"), selector.RHS.selected[0]);
    checkDirty();
});

$("#top").click((e) => {
    selector.top();
    populatePrinted();
    scroll($("#selectedList"), selector.RHS.selected[0]);
    checkDirty();
});

$("#bottom").click((e) => {
    selector.bottom();
    populatePrinted();
    scroll($("#selectedList"), selector.RHS.selected[0]);
    checkDirty();
});

$("#up").click((e) => {
    selector.up();
    populatePrinted();
    scroll($("#selectedList"), selector.RHS.selected[0]);
    checkDirty();
});

$("#down").click((e) => {
    selector.down();
    populatePrinted();
    scroll($("#selectedList"), selector.RHS.selected[0]);
    checkDirty();
});

// Utilities
declare global {
    interface String {
        sanitize(): string;
    }
}

String.prototype.sanitize = function (this: string) {
    return this.replace(/\s/g, "-").replace(/[^a-z0-9\-]/gi, "");
};
