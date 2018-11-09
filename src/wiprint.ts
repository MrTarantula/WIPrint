import WITClient = require("TFS/WorkItemTracking/RestClient");
import Models = require("TFS/WorkItemTracking/Contracts");
import moment = require("moment");
import Q = require("q");

const extensionContext = VSS.getExtensionContext();
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
              return Q.all(pages);
            })
            .then((pages: any) => {
              const items = document.createElement("div");
              items.setAttribute("id", "workitems");
              pages.forEach(page => (items.innerHTML += page));
              document.body.appendChild(items);

              setTimeout(() => {
                window.focus(); // needed for IE
                let ieprint = document.execCommand("print", false, null);
                if (!ieprint) {
                  (window as any).print();
                }
                items.parentElement.removeChild(items);
              }, 1000);
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
                  return Q.all(pages);
                })
                .then((pages: any) => {
                  const items = document.createElement("div");
                  items.setAttribute("id", "workitems");
                  pages.forEach(page => (items.innerHTML += page));
                  document.body.appendChild(items);

                  setTimeout(() => {
                    window.focus(); // needed for IE
                    let ieprint = document.execCommand("print", false, null);
                    if (!ieprint) {
                      (window as any).print();
                    }
                    items.parentElement.removeChild(items);
                  }, 1000);
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

function getFields(
  workItem: Models.WorkItem
): IPromise<Models.WorkItemTypeFieldInstance[]> {
  return VSS.getService(VSS.ServiceIds.ExtensionData).then(
    (service: IExtensionDataService) => {
      return service.getValue<Models.WorkItemTypeFieldInstance[]>(
        `wiprint-${workItem.fields["System.WorkItemType"].sanitize()}`,
        {
          scopeType: "user",
          defaultValue: dummy as Models.WorkItemTypeFieldInstance[]
        }
      );
    }
  );
}

function getHistory(workItem: Models.WorkItem) {
  return client.getComments(workItem.id);
}

function prepare(workItems: Models.WorkItem[]) {
  return workItems.map(item => {
    return Q.all([
      getFields(item) as any,
      getHistory(item),
      getWorkItemFields()
    ])
      .then(results => {
        return results;
      })
      .spread(
        (
          fields: Models.WorkItemTypeFieldInstance[],
          history: Models.WorkItemComments,
          allFields: Models.WorkItemField[]
        ) => {
          let insertText =
            `<div class="item"><h2><a class="wilink" href="${item.url}">${item.fields["System.WorkItemType"]} ` +
            `${item.id} - ${item.fields["System.Title"]}</a></h2>`;
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
                    if (history.count > 0) {
                      insertText += `<p><b>${field.name}</b></p>`;
                      history.comments.forEach(comment => {
                        if (comment.revisedBy.name) {
                          insertText += `<div class="history"><b>${moment(
                            comment.revisedDate
                          ).format(
                            localeTime
                          )} ${comment.revisedBy.name.substring(
                            0,
                            comment.revisedBy.name.indexOf("<") - 1
                          )}:</b><br> ${comment.text.htmlize()}</div>`;
                        } else {
                          insertText += `<div class="history"><b>${moment(
                            comment.revisedDate
                          ).format(localeTime)} ${
                            comment.revisedBy.displayName
                          }:</b><br> ${comment.text.htmlize()}</div>`;
                        }
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
              if (history.count > 0) {
                insertText += `<p><b>${field.name}</b></p>`;
                history.comments.forEach(comment => {
                  if (comment.revisedBy.name) {
                    insertText += `<div class="history"><b>${moment(
                      comment.revisedDate
                    ).format(localeTime)} ${comment.revisedBy.name.substring(
                      0,
                      comment.revisedBy.name.indexOf("<") - 1
                    )}:</b><br> ${comment.text.htmlize()}</div>`;
                  } else {
                    insertText += `<div class="history"><b>${moment(
                      comment.revisedDate
                    ).format(localeTime)} ${
                      comment.revisedBy.displayName
                    }:</b><br> ${comment.text.htmlize()}</div>`;
                  }
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
