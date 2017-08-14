import WITClient = require("TFS/WorkItemTracking/RestClient");
import Models = require("TFS/WorkItemTracking/Contracts");
import moment = require("moment");
import Q = require("q");

const extensionContext = VSS.getExtensionContext();
const dataService = VSS.getService(VSS.ServiceIds.ExtensionData);
const vssContext = VSS.getWebContext();
const client = WITClient.getClient();

const fields: Models.WorkItemField[] = [];

interface IQuery {
    id: string;
    isPublic: boolean;
    name: string;
    path: string;
    wiql: string;
}

interface IActionContext {
    id?: number;
    workItemId?: number;
    query?: IQuery;
    queryText?: string;
    ids?: number[];
    workItemIds?: number[];
    columns?: string[];
}

const dummy = [
    { name: "Assigned To", referenceName: "System.AssignedTo" },
    { name: "State", referenceName: "System.State" },
    { name: "Created Date", referenceName: "System.CreatedDate" },
    { name: "Description", referenceName: "System.Description" },
    { name: "Acceptance Criteria", referenceName: "Microsoft.VSTS.Common.AcceptanceCriteria" },
    { name: "History", referenceName: "System.History" }
];

// Utilities
declare global {
    interface String {
        sanitize(): string;
    }
}

String.prototype.sanitize = function (this: string) {
    return this.replace(/\s/g, "-");
};

const printWorkItems = {
    getMenuItems: (context: any) => {
        let menuItemText = "Print";
        if (context.workItemIds && context.workItemIds.length > 1) {
            menuItemText = "Print Selection";
        }

        return [{
            action: (actionContext: IActionContext) => {
                const wids = actionContext.workItemIds || actionContext.ids || [actionContext.workItemId];

                return client.getWorkItems(wids, undefined, undefined, Models.WorkItemExpand.Fields)
                    .then((workItems) => print(workItems));
            },
            icon: "static/img/print14.png",
            text: menuItemText,
            title: menuItemText,
        } as IContributedMenuItem];
    },
};

const printQueryToolbar = {
    getMenuItems: (context: any) => {
        return [{
            action: (actionContext: IActionContext) => {
                return client.queryByWiql(
                    { query: actionContext.query.wiql }, vssContext.project.name, vssContext.team.name,
                ).then((result) => {
                    if (result.workItemRelations) {
                        return result.workItemRelations.map((wi) => wi.target.id);
                    } else {
                        return result.workItems.map((wi) => wi.id);
                    }
                }).then((wids) => {
                    return client.getWorkItems(wids, undefined, undefined, Models.WorkItemExpand.Fields)
                        .then((workItems) => print(workItems));
                });
            },
            icon: "static/img/print16.png",
            text: "Print All",
            title: "Print All",
        } as IContributedMenuItem];
    },
};

function prepare(workItems: Models.WorkItem[]) {
    return dataService.then((service: IExtensionDataService) => {
        return workItems.map((item) => {
            return service.getValue(`wiprint-${item.fields["System.WorkItemType"].sanitize()}`,
                { scopeType: "user", defaultValue: dummy as Models.WorkItemTypeFieldInstance[] })
                .then((data: Models.WorkItemTypeFieldInstance[]) => {
                    // data = data.length == 0 ? dummy as Models.WorkItemTypeFieldInstance[] : data;
                    let insertText =
                        `<div class="item"><h2>${item.fields["System.WorkItemType"]} ` +
                        `${item.id} - ${item.fields["System.Title"]}</h2>`;
                    data.forEach((field) => {
                        if (item.fields[field.referenceName]) {
                            if (moment(item.fields[field.referenceName], "YYYY-MM-DDTHH:mm:ss.SSSZ", true).isValid()) {
                                insertText += `<p><b>${field.name}:</b> ${moment(item.fields[field.referenceName])
                                    .format("MM/DD/YYYY")}</p>`;
                            } else if (item.fields[field.referenceName] instanceof Array) {
                                insertText += `<p><b>${field.name}:</b></p>`;
                                item.fields[field.referenceName].forEach((fi) => {
                                    insertText += `<p>${fi}</p>`;
                                });
                            } else {
                                // dates that didn't pass strict validation above shoule be dropped
                                // if (!moment(item.fields[field.referenceName], "YYYY-MM-DDTHH:mm:ss.SSSZ").isValid()) {
                                insertText += `<p><b>${field.name}:</b> ${item.fields[field.referenceName]}</p>`;
                                // }
                            }
                        }
                    });
                    insertText += "</div>";
                    return insertText;
                });
        });
    });
}

function print(workItems: Models.WorkItem[]) {
    Q.all(prepare(workItems)).then((pages) => {
        pages.forEach((page) => {
            Q.resolve(page).then((p) => document.getElementById("workitems").innerHTML += p);
        });
    }).then(() => {
        window.focus(); // needed for IE
        window.print();
        document.getElementById("workitems").innerHTML = "";
    });
}

// VSTS/2017
VSS.register(`${extensionContext.publisherId}.${extensionContext.extensionId}.print-work-item`, printWorkItems);
VSS.register(`${extensionContext.publisherId}.${extensionContext.extensionId}.print-query-toolbar`, printQueryToolbar);
VSS.register(`${extensionContext.publisherId}.${extensionContext.extensionId}.print-query-menu`, printQueryToolbar);

// 2015
VSS.register(`print-work-item`, printWorkItems);
VSS.register(`print-query-menu`, printQueryToolbar);
