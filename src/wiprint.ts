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
  {
    name: "Acceptance Criteria",
    referenceName: "Microsoft.VSTS.Common.AcceptanceCriteria"
  },
  { name: "History", referenceName: "System.History" }
];

// Utilities
declare global {
  interface String {
    sanitize(): string;
    htmlize(): string;
  }
}

const localeTime = "L LT";

String.prototype.sanitize = function(this: string) {
  return this.replace(/\s/g, "-").replace(/[^a-z0-9\-]/gi, "");
};

String.prototype.htmlize = function(this: string) {
  return this.replace(/<\/*(step|param|desc|comp)(.*?)>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, `"`)
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
};

const printWorkItems = {
  getMenuItems: (context: any) => {
    let menuItemText = "Print";
    if (context.workItemIds && context.workItemIds.length > 1) {
      menuItemText = "Print Selection";
    }

    return [
      {
        action: (actionContext: IActionContext) => {
          const wids = actionContext.workItemIds ||
            actionContext.ids || [actionContext.workItemId || actionContext.id];

          return getWorkItems(wids)
            .then(workItems => prepare(workItems))
            .then(pages => {
              Q.all(pages)
                .then(pages => pages)
                .then(pages => {
                  pages.forEach(
                    page =>
                      (document.getElementById("workitems").innerHTML += page)
                  );

                  window.focus(); // needed for IE
                  let ieprint = document.execCommand("print", false, null);
                  if (!ieprint) {
                    window.print();
                  }
                  document.getElementById("workitems").innerHTML = "";
                });
            });
        },
        icon: "static/img/print14.png",
        text: menuItemText,
        title: menuItemText
      } as IContributedMenuItem
    ];
  }
};

const printQueryToolbar = {
  getMenuItems: (context: any) => {
    return [
      {
        action: (actionContext: IActionContext) => {
          return client
            .queryByWiql(
              { query: actionContext.query.wiql },
              vssContext.project.name,
              vssContext.team.name
            )
            .then(result => {
              if (result.workItemRelations) {
                return result.workItemRelations.map(wi => wi.target.id);
              } else {
                return result.workItems.map(wi => wi.id);
              }
            })
            .then(wids => {
              return getWorkItems(wids)
                .then(workItems => prepare(workItems))
                .then(pages => {
                  Q.all(pages)
                    .then(pages => pages)
                    .then(pages => {
                      pages.forEach(
                        page =>
                          (document.getElementById(
                            "workitems"
                          ).innerHTML += page)
                      );

                      window.focus(); // needed for IE
                      let ieprint = document.execCommand("print", false, null);
                      if (!ieprint) {
                        window.print();
                      }
                      document.getElementById("workitems").innerHTML = "";
                    });
                });
            });
        },
        icon: "static/img/print16.png",
        text: "Print All",
        title: "Print All"
      } as IContributedMenuItem
    ];
  }
};

// Promises
function getWorkItems(wids: number[]): IPromise<Models.WorkItem[]> {
  return client.getWorkItems(
    wids,
    undefined,
    undefined,
    Models.WorkItemExpand.Fields
  );
}

function getWorkItemFields() {
  return client.getFields();
}

function getFields(workItem: Models.WorkItem) {
  return dataService.then((service: IExtensionDataService) => {
    return service
      .getValue(
        `wiprint-${workItem.fields["System.WorkItemType"].sanitize()}`,
        {
          scopeType: "user",
          defaultValue: dummy as Models.WorkItemTypeFieldInstance[]
        }
      )
      .then(
        (data: Models.WorkItemTypeFieldInstance[]) =>
          data.length > 0 ? data : dummy
      );
  });
}

function getHistory(workItem: Models.WorkItem) {
  if (vssContext.account.name === "TEAM FOUNDATION") {
    return client.getComments(workItem.id).then(comments => {
      return comments.comments.map(comment => {
        return {
          revisedBy: comment.revisedBy,
          revisedDate: comment.revisedDate,
          revision: comment.revision,
          text: comment.text
        } as Models.WorkItemComment;
      });
    });
  }

  return client.getComments(workItem.id).then(comments => comments.comments);
}

function prepare(workItems: Models.WorkItem[]) {
  return workItems.map(item => {
    return Q.all([getFields(item), getHistory(item), getWorkItemFields()])
      .then(results => {
        return results;
      })
      .spread(
        (
          fields: Models.WorkItemTypeFieldInstance[],
          history: Models.WorkItemComment[],
          allFields: Models.WorkItemField[]
        ) => {
          let insertText =
            `<div class="item"><h2>${item.fields["System.WorkItemType"]} ` +
            `${item.id} - ${item.fields["System.Title"]}</h2>`;
          fields.forEach(field => {
            const fieldRef = allFields.filter(
              f => f.referenceName === field.referenceName
            )[0];
            if (item.fields[field.referenceName]) {
              if (fieldRef.type) {
                switch (fieldRef.type) {
                  case Models.FieldType.DateTime:
                    if (
                      moment(item.fields[field.referenceName]).diff(
                        moment(),
                        "years"
                      ) < 1000
                    ) {
                      insertText += `<p><b>${field.name}:</b> ${moment(
                        item.fields[field.referenceName]
                      ).format(localeTime)}</p>`;
                    }
                    break;
                  case Models.FieldType.Html:
                    insertText += `<p><b>${field.name}:</b> ${item.fields[
                      field.referenceName
                    ].htmlize()}</p>`;
                    break;
                  case Models.FieldType.History:
                    if (history.length > 0) {
                      insertText += `<p><b>${field.name}</b></p>`;
                      history.forEach(comment => {
                        insertText += `<div class="history"><b>${moment(
                          comment.revisedDate
                        ).format(
                          localeTime
                        )} ${comment.revisedBy.name.substring(
                          0,
                          comment.revisedBy.name.indexOf("<") - 1
                        )}:</b><br> ${comment.text}</div>`;
                      });
                    }
                    break;
                  default:
                    insertText += `<p><b>${field.name}:</b> ${
                      item.fields[field.referenceName]
                    }</p>`;
                    break;
                }
              } else {
                insertText += `<p><b>${field.name}:</b> ${
                  item.fields[field.referenceName]
                }</p>`;
              }
            } else if (field.referenceName === "System.History") {
              if (history.length > 0) {
                insertText += `<p><b>${field.name}</b></p>`;
                history.forEach(comment => {
                  insertText += `<div class="history"><b>${moment(
                    comment.revisedDate
                  ).format(localeTime)} ${comment.revisedBy.name.substring(
                    0,
                    comment.revisedBy.name.indexOf("<") - 1
                  )}:</b><br> ${comment.text}</div>`;
                });
              }
            }
          });
          insertText += "</div>";
          return insertText;
        }
      );
  });
}

// VSTS/2017
VSS.register(
  `${extensionContext.publisherId}.${
    extensionContext.extensionId
  }.print-work-item`,
  printWorkItems
);
VSS.register(
  `${extensionContext.publisherId}.${
    extensionContext.extensionId
  }.print-query-toolbar`,
  printQueryToolbar
);
VSS.register(
  `${extensionContext.publisherId}.${
    extensionContext.extensionId
  }.print-query-menu`,
  printQueryToolbar
);

// 2015
VSS.register(`print-work-item`, printWorkItems);
VSS.register(`print-query-menu`, printQueryToolbar);
