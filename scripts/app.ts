/// <reference path="../typings/index.d.ts" />

import WitClient = require("TFS/WorkItemTracking/RestClient");
import moment = require('moment');

let extensionContext = VSS.getExtensionContext();

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
    "Microsoft.VSTS.Scheduling.StartDate"
];

interface IQueryObject {
    id: string;
    isPublic: boolean;
    name: string;
    path: string;
    wiql: string;
}

interface IActionContext {
    id?: number;
    workItemId?: number;
    query?: IQueryObject;
    queryText?: string;
    ids?: number[];
    workItemIds?: number[];
    columns?: string[];
}

var printWorkItems = {
    getMenuItems: (context: any) => {

        var text = 'Print';
        if (context.workItemIds.length > 1) {
            text = 'Print Selection';
        }

        return [<IContributedMenuItem>{
            title: "Print",
            text: text,
            icon: "img/print.png",
            action: (actionContext: IActionContext) => {
                const client = WitClient.getClient();
                const wids = context.workItemIds || [actionContext.workItemId];

                return client.getWorkItems(wids, fields).then(
                    function (workItems) {
                        print(workItems);
                    }
                );
            }
        }];
    }
};

var printQueryToolbar = {
    getMenuItems: (context: any) => {
        return [<IContributedMenuItem>{
            title: "Print All",
            text: "Print All",
            icon: "img/print.png",
            showText: true,
            action: (actionContext: IActionContext) => {
                const client = WitClient.getClient();
                const VSSContext = VSS.getWebContext();

                return client.queryByWiql({ query: actionContext.query.wiql }, VSSContext.project.name, VSSContext.team.name).then(function (result) {

                    if (!result.workItemRelations) {
                        var wids = result.workItems.map(function (wi) { return wi.id });
                    }
                    else {
                        var wids = result.workItemRelations.map(function (wi) { return wi.target.id });
                    }

                    client.getWorkItems(wids, fields).then(
                        function (workItems) {
                            print(workItems);
                        }
                    );
                });
            }
        }];
    }
};

function print(workItems: any[]) {
    var insertText = '';

    workItems.forEach((item, index) => {
        insertText +=
        `
        <div class="item">
            <h2>${item.fields["System.WorkItemType"]} ${item.id} - ${item.fields["System.Title"]}</h2>
            <span>Assigned to: ${item.fields["System.AssignedTo"] ? item.fields["System.AssignedTo"] : "Unassigned"}</span><br>
            <span>State: ${item.fields["System.State"]}</span><br>
            <span>Created: ${moment(item.fields["System.CreatedDate"]).format("M/D/YYYY")}</span><br>
            <span>Started: ${item.fields["Microsoft.VSTS.Scheduling.StartDate"] ? moment(item.fields["Microsoft.VSTS.Scheduling.StartDate"]).format("M/D/YYYY"): "None"}</span><br>
            <span>Due: ${item.fields["Microsoft.VSTS.Scheduling.DueDate"] ? moment(item.fields["Microsoft.VSTS.Scheduling.DueDate"]).format("M/D/YYYY") : "None"}</span><br>
            <h3>Description</h3>
            <p>${item.fields["System.Description"]}</p>
            <h3>Conversation</h3>
            <p>${item.fields["System.History"] ? item.fields["System.History"] : "None" }</p>
        </div>
        `;
    });

    $('#workItems').html(insertText);
    window.focus(); //needed for IE
    window.print();
}

VSS.register(`${extensionContext.publisherId}.${extensionContext.extensionId}.print-work-item`, printWorkItems);
VSS.register(`${extensionContext.publisherId}.${extensionContext.extensionId}.print-query-toolbar`, printQueryToolbar);