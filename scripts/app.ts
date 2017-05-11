import WITClient = require("TFS/WorkItemTracking/RestClient");
import Models = require("TFS/WorkItemTracking/Contracts");
import moment = require("moment");

const extensionContext = VSS.getExtensionContext();
const vssContext = VSS.getWebContext();
const client = WITClient.getClient();

const fields = [
    "System.ID",
    "System.Title",
    "System.AssignedTo",
    "System.Description",
    "System.State",
    "System.History",
    "System.WorkItemType",
    "System.CreatedDate",
    "Microsoft.VSTS.Scheduling.DueDate",
    "Microsoft.VSTS.Scheduling.StartDate",
];

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

const printWorkItems = {
    getMenuItems: (context: any) => {
        let menuItemText = "Print";
        if (context.workItemIds.length > 1) {
            menuItemText = "Print Selection";
        }

        return [{
            action: (actionContext: IActionContext) => {
                const wids = context.workItemIds || [actionContext.workItemId];

                return client.getWorkItems(wids, fields).then((workItems) => print(workItems));
            },
            icon: "img/print14.png",
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
                    let wids = [];
                    if (result.workItemRelations) {
                        wids = result.workItemRelations.map((wi) => wi.target.id);
                    } else {
                        wids = result.workItems.map((wi) => wi.id);
                    }

                    client.getWorkItems(wids, fields).then((workItems) => print(workItems));
                });
            },
            icon: "img/print16.png",
            text: "Print All",
            title: "Print All",
        } as IContributedMenuItem];
    },
};

function print(workItems: Models.WorkItem[]): void {
    let insertText = "";

    workItems.forEach((item, index) => {
        insertText +=
            `
        <div class="item">
            <h2>${item.fields["System.WorkItemType"]} ${item.id} - ${item.fields["System.Title"]}</h2>
            <span>Assigned to: ${item.fields["System.AssignedTo"] ?
                item.fields["System.AssignedTo"] : "Unassigned"}</span><br>
            <span>State: ${item.fields["System.State"]}</span><br>
            <span>Created: ${moment(item.fields["System.CreatedDate"]).format("M/D/YYYY")}</span><br>
            <h3>Description</h3>
            <p>${item.fields["System.Description"] ?
                item.fields["System.Description"] : "No Description"}</p>
            <h3>Conversation</h3>
            <p>${item.fields["System.History"] ? item.fields["System.History"] : "None"}</p>
        </div>
        `;
    });

    $("#workitems").html(insertText);
    window.focus(); // needed for IE
    window.print();
}

VSS.register(`${extensionContext.publisherId}.${extensionContext.extensionId}.print-work-item`, printWorkItems);
VSS.register(`${extensionContext.publisherId}.${extensionContext.extensionId}.print-query-toolbar`, printQueryToolbar);
