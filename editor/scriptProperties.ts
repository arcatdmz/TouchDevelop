
///<reference path='refs.ts'/>

module TDev
{
    export class ScriptProperties
        extends CodeView
    {
        private theScript:AST.App;
        constructor() {
            super()
        }
        private scriptName = HTML.mkTextInput("text", lf("script name"));
        private colorContainer = div("scriptPropContainer");
        private iconArtIdContainer = div("scriptPropContainer");
        private splashArtIdContainer = div("scriptPropContainer");
        private isLibrary:HTMLElement;
        private showAd:HTMLElement;
        private allowExport: HTMLElement;
        private isCloud: HTMLElement;
        private pubId:HTMLElement;
        private formRoot = div("varProps");
        private mdRoot = div(null);
        private description = HTML.mkTextArea();
        private revertButton:HTMLElement;
        public getTick() { return Ticks.viewScriptInit; }
        private platformsDiv: HTMLElement;

        private managementSection: HTMLElement;
        private exportSection: HTMLElement;
        private dataSection: HTMLElement;
        private instrumentationSection: HTMLElement;
        private settingsSection: HTMLElement;
        private platformSection: HTMLElement;

        static allPlatforms = {
            "HTML5": PlatformCapability.AnyWeb,
            "App Studio": PlatformCapability.AppStudio,
            "Cordova App": PlatformCapability.CordovaApp,
            "Azure Web Site": PlatformCapability.AzureWebSite,
        }

        static shortPlatforms = {
            "web": PlatformCapability.AnyWeb,
            "appstudio": PlatformCapability.AppStudio,
            "cordova": PlatformCapability.CordovaApp,
            "azure": PlatformCapability.AzureWebSite,
        }

        public nodeType() { return "app"; }

        private editCaps()
        {
            var m = new ModalDialog();

            var platforms = this.theScript.getPlatformRaw();

            m.add(div("wall-dialog-header", lf("i want to use:")));

            var container = div("modalList");
            container.style.height = "14em";
            Util.setupDragToScroll(container);
            m.add(container)

            var boxes = []

            var updateBoxes = () => {
                boxes.forEach((ch) => HTML.setCheckboxValue(ch, !!(platforms & ch.flag)))

            }

            AST.App.platforms.forEach((k) => {
                var n = k.name
                var flag = k.cap
                var ch = HTML.mkCheckBox(n, (v) => {
                    if (v) platforms |= flag;
                    else platforms &= ~flag;
                });
                (<any>ch).flag = flag;
                boxes.push(ch)
                var d = div("capabilityBox", ch, div("platformCaps",
                    Object.keys(ScriptProperties.shortPlatforms).map((n) => span((ScriptProperties.shortPlatforms[n] & flag) == flag ? "" : "greyedOut", n + " "))))
                container.appendChild(d);
            });
            updateBoxes()

            m.add(div("wall-dialog-buttons",
                HTML.mkButton(lf("set to current"), () => {
                    platforms = PlatformCapability.Current;
                    m.dismiss()
                }),
                HTML.mkButton(lf("App Studio"), () => {
                    platforms = PlatformCapability.AppStudio;
                    m.dismiss()
                }),
                HTML.mkButton(lf("Cordova App"), () => {
                    platforms = PlatformCapability.CordovaApp;
                    m.dismiss()
                }),
                HTML.mkButton(lf("Azure web site"), () => {
                    platforms = PlatformCapability.AzureWebSite;
                    m.dismiss()
                }),
                HTML.mkButton(lf("any client"), () => {
                    platforms = PlatformCapability.AnyClient;
                    updateBoxes()
                    m.dismiss()
                }),
                HTML.mkButton(lf("done"), () => { m.dismiss() })
                ));

            m.onDismiss = () => {
                this.theScript.setPlatform(platforms);
                this.updatePlatformDiv();
            };

            m.show();
        }

        private updatePlatformDiv()
        {
            var runOn = "";

            if (this.theScript.getPlatformRaw() & PlatformCapability.Current) {
                runOn = lf("Current device");
            } else {
                Object.keys(ScriptProperties.allPlatforms).forEach((n) => {
                    if (this.theScript.supportsAllPlatforms(ScriptProperties.allPlatforms[n]))
                        runOn += ", " + n;
                });

                if (runOn) runOn = runOn.slice(2);
            }

            this.platformsDiv.setChildren(<any[]>[
                span("bold", runOn),
                div("formHint",
                  lf("Show errors in the editor if the script uses any APIs that prevent it from running on these platforms.")),
                div(null,
                    HTML.mkButton(lf("settings"), () => {
                        this.editCaps();
                    }))
            ]);
        }

        public init(e: Editor) {
            super.init(e);

            function btn(store: string, name : string) {
                //var img = ScriptIcons.getWinLogo(store);
                //if (img) {
                //    img.style.fontSize = "0.7em";
                //    img.style.marginTop = "0.3em";
                //} else {
                //}
                var img = div('store-button', name);
                return HTML.mkButtonElt("wall-button", img).withClick(() => {
                    e.saveStateAsync({ forReal: true }).done(() => {
                        if (store == "azure") {
                            tick(Ticks.exportAzure);
                            AppExport.setupAzure();
                        }
                        else if (store == "cordova") {
                            tick(Ticks.exportCordova);
                            AppExport.deployCordova(Script, e.getBaseScriptId())
                        }
                        else {
                            tick(Ticks.exportHTML5);
                            if (ScriptEditorWorldInfo.status !== "published") {
                                ModalDialog.info(lf("Sorry, the app could not be created."),
                                    lf("You can only create apps from scripts that are published. You can always publish your script as hidden."));
                            } else {
                                AppExport.createWebApp(ScriptEditorWorldInfo.baseId);
                            }
                        }
                    });
                });
            }

            this.isLibrary = HTML.mkCheckBox(lf("this script is a library"), (v) => this.theScript.isLibrary = v);
            this.isLibrary.appendChild(Editor.mkHelpLink("libraries"));
            this.showAd = HTML.mkCheckBox(lf("show advertisement"), (v) => this.theScript.showAd = v);
            this.showAd.appendChild(Editor.mkHelpLink("ads"));
            // not supported anymore
            this.showAd.style.display = 'none';
            this.allowExport = HTML.mkCheckBox(lf("allow other users to export to app"), (v) => this.exportChanged(v));
            this.allowExport.appendChild(Editor.mkHelpLink("allow export to app"));
            this.isCloud = HTML.mkCheckBox(lf("this script is a web service"), (v) => this.theScript.isCloud = v)
            this.isCloud.appendChild(Editor.mkHelpLink("cloud libraries"));
            this.formRoot.setChildren([div("varLabel", lf("script properties")),
                div("formLine", lf("name: "), this.scriptName, Editor.mkHelpLink("script updates", lf("about names & updates"))),
                div("groupLine"), // filled in later on
                this.pubId = div("inline-block"),
                this.colorContainer,
                this.iconArtIdContainer,
                this.splashArtIdContainer,
                this.managementSection = div("formLine",
                    HTML.mkButton(lf("delete script"), () => this.deleteScript()),
                    HTML.mkButton(lf("clone script"), () => TheEditor.cloneScriptAsync().done()),
                    this.revertButton = HTML.mkButton(lf("revert to published version"), () => {
                        ModalDialog.ask(lf("Do you really want to revert this script to the latest published version?"), lf("revert"), () => { this.revert(); });
                    }),
                    (Browser.isCellphone ? null :
                    HTML.mkButton(lf("for print/email"), () => this.renderScript())),
                    HTML.mkButton(lf("diff to base"), () => ScriptProperties.diffToBase()),
                    HTML.mkButton(lf("make atomic"), () => ScriptProperties.makeAtomic())
                    ),
                this.exportSection = divId("exportApp", "formLine",
                    div("varLabel", lf("export")),
                    btn("cordova", lf("Cordova app")),
                    btn("azure", lf("Azure web site")),
                    /*
                    btn("win8", null),
                    btn("wp8", null),
                    btn("android", "Android"),
                    btn("ios", "iPhone/iPad"),
                    */
                    btn("html5", "HTML5 web app")
                    ),
                this.dataSection = divId("dataManagement", "formLine",
                    div("varLabel", lf("manage data")),
                    HTML.mkButton(lf("delete local data and permissions"), () => this.deleteData()),
                    HTML.mkButton(lf("cloud sessions"), () => this.manageSessions())
                // HTML.mkButton(lf("view permissions"), () => this.managePermissions())
                    ),
                this.instrumentationSection = div("formLine",
                    div("varLabel", lf("run with instrumentation")),
                    div("formHint",
                        Editor.mkHelpLink("coverage", lf("about coverage")),
                        Editor.mkHelpLink("profiling", lf("about profile")),
                        lf("After the script stops, browse the code to see collected information."),
                        Editor.mkHelpLink("insights", lf("about insights")),
                        " ",
                        lf("For published scripts, also look at the tab of the published script page to find anonymously collected crowd-sourced profile and coverage data.")),
                    HTML.mkButton(lf("profile"), () => TheEditor.runWithProfiling()),
                    HTML.mkButton(lf("coverage"), () => TheEditor.runWithCoverage())
                    ),
                this.platformSection = div("formLine",
                    div("varLabel", lf("i want it to run on")),
                    this.platformsDiv = div(null)
                    ),
                div("varLabel", lf("description")),
                this.description,
                this.settingsSection = div("formLine",
                    this.isLibrary,
                    this.isCloud,
                    this.showAd,
                    this.allowExport),
                dbg ? div("formLine",
                    div("varLabel", lf("under the hood (dbg)")),
                    HTML.mkButton(lf("test merge"), () => this.mergeWithScript(true)),
                    HTML.mkButton(lf("merge"), () => this.mergeWithScript()),
                    HTML.mkButton(lf("script text"), () => this.scriptText()),
                    HTML.mkButton(lf("editor settings"), () => TheEditor.popupMenu()),
                    HTML.mkButton(lf("compiled JS"), () => TheEditor.showCurrentJs()),
                    HTML.mkButton(lf("compiled JS (debug)"), () => TheEditor.showCurrentJs({ debugging: true })),
                    HTML.mkButton(lf("deploy REST"), () => this.deployRestApp()),
                    HTML.mkButton(lf("to JSON"), () => this.dumpToJson()),
                    HTML.mkButton(lf("rebuild session cache"), () => TheEditor.currentRt.sessions.resetCurrentSession()),
                    HTML.mkButton(lf("public -> test"), () => this.publicToTest()),
                    HTML.mkButton(lf("speech driven"), () => TheEditor.calculator.searchApi.listenToSpeech())
                    ) : undefined,
                EditorSettings.changeSkillLevelDiv(this.editor, Ticks.changeSkillScriptProperties, "formLine marginBottom"),
                this.mdRoot
            ]);
            this.description.className = "variableDesc";
        }

        static diffToBase()
        {
            var id = ScriptEditorWorldInfo.baseId
            if (!id) {
                ModalDialog.info("no can do", "no base script")
                return;
            }

            ScriptProperties.showDiff(
                ScriptCache.getScriptAsync(id).then(text => {
                    if (!text) return;
                    var baseapp = AST.Parser.parseScript(text);
                    AST.Diff.diffApps(baseapp, Script, {
                        tutorialMode: /tutorialDiff/.test(document.URL)
                    });
                    return Script;
                }))
        }

        static makeAtomic()
        {
            var acts = AST.AtomicVisitor.run(Script)
            acts = acts.filter(a => !a.isAtomic && a.getName() != "main")
            if (acts.length == 0) {
                ModalDialog.info(lf("it's as atomic as it gets"),
                                 lf("All actions that could be marked atomic already are."))
                return
            }

            var names = ""

            if (acts.length > 10) {
                names = acts.map(a => a.getName()).slice(0, 8).join(", ") + " and " + (acts.length - 8) + " more"
            } else {
                names = acts.map(a => a.getName()).join(", ")
            }


            ModalDialog.ask("The following actions can be made atomic: " + names,
                            "make atomic",
                            () => {
                                TheEditor.undoMgr.clearCalc();
                                TheEditor.undoMgr.pushMainUndoState();
                                acts.forEach(a => {
                                    a.isAtomic = true
                                    a.notifyChange()
                                })
                                TheEditor.dismissSidePane();
                                TheEditor.queueNavRefresh();
                            })
        }

        static showDiff(getScrAsync:Promise, additionalActions:any = {}, showAll = false)
        {
            var m = new ModalDialog()
            var prog = HTML.mkProgressBar()
            m.add(prog)
            m.addHTML("loading...")
            prog.start()

            getScrAsync.done((scr:AST.App) => {
                if (!scr) {
                    m.dismiss();
                    return;
                }

                var r = new Renderer()
                var s = r.renderDiff(scr, showAll)
                var d = div("diffOuter")
                Browser.setInnerHTML(d, s)

                var jumpNodes = []
                var jumpPos = 0
                var prevJumpPos = 0

                Util.iterHtml(d, e => {
                    if (/diff(Decl|Stmt|Tokens)/.test(e.className)) {
                        jumpNodes.push(e)
                        return true;
                    }

                    return false;
                })

                var goTo = () => {
                    if (jumpNodes[prevJumpPos])
                        jumpNodes[prevJumpPos].setFlag("diff-selected", false)
                    if (jumpNodes[jumpPos]) {
                        jumpNodes[jumpPos].setFlag("diff-selected", true)
                        prevJumpPos = jumpPos
                        Util.ensureVisible(jumpNodes[jumpPos], d)
                    }
                };

                m.empty()
                m.add(d)
                Util.setupDragToScroll(d)
                d.style.maxHeight = (SizeMgr.windowHeight * 0.8) / SizeMgr.topFontSize + "em";

                var btns:HTMLElement[] = Object.keys(additionalActions).map(k => HTML.mkButton(k, additionalActions[k]))

                if (jumpNodes.length > 0) {
                    btns.push(
                        HTML.mkButton(lf("prev diff"), () => {
                            if (jumpPos > 0) jumpPos--;
                            goTo()
                        }),
                        HTML.mkButton(lf("next diff"), () => {
                            if (jumpPos < jumpNodes.length - 1) jumpPos++;
                            goTo()
                        }))
                } else {
                    btns.push(div("diffSame", lf("seems the same")))
                }

                m.add(div("diffButtons", btns))
                goTo();
            })

            m.fullWhite()
            m.stretchWide()
            m.show()
            return m
        }

        static winId = 0;
        static printScript(s:AST.App)
        {
            var r = new CopyRenderer();
            var text = r.dispatch(s);
            try {
                var w = window.open("about:blank", "tdScript" + ScriptProperties.winId++);
                w.document.write("<!DOCTYPE html><html><head>" + CopyRenderer.css +
                                 "<title>" + Util.htmlEscape("Source: " + s.getName()) + "</title>" +
                                 "</head><body>" + text + "</body></html>");
            } catch (e) {
                ModalDialog.info("cannot print",
                "we couldn't print open a new window to print this page. check the popup-blocker preferences.");
            }
        }

        private renderScript()
        {
            ScriptProperties.printScript(Script);
        }

        private publicToTest()
        {
            Script.actions().forEach((a) => {
                if (a.isRunnable()) {
                    a._isTest = true;
                    a.notifyChange();
                }
            });
            TheEditor.queueNavRefresh();
        }

        private dumpToJson()
        {
            var app = AST.Parser.parseScript(Script.serialize())
            app.hasIds = true
            new TDev.AST.InitIdVisitor(false).dispatch(app)

            AST.TypeChecker.tcScript(app, true)

            var j = TDev.AST.Json.dump(app)
            var text = AST.Json.serialize(j, false)
            var prevText = AST.App.sanitizeScriptTextForCloud( app.serialize() );
            AST.loadScriptAsync(Editor.scriptSource(text)).done((res:AST.LoadScriptResult) => {
                var newText = AST.App.sanitizeScriptTextForCloud( Script.serialize() );
                setGlobalScript(res.prevScript);
                if (prevText != newText) {
                    ModalDialog.showText("OOPS:" + prevText + "\n########\n" + newText);
                } else {
                    var text = JSON.stringify(j, null, "  ")
                    if (text.length > 10000)
                        ModalDialog.showText("JSON size: " + text.length)
                    else
                        ModalDialog.showText(text)
                }
            })
        }

        private scriptText()
        {
            var loadScript = (t:string, f) => {
                TheEditor.loadScriptTextAsync(ScriptEditorWorldInfo, t, null).then(() => {
                    if (f) f();
                    TheEditor.renderDefaultDecl();
                }).done();
            };
            (<any>TDev).loadScript = loadScript;

            var m = ModalDialog.showText(this.theScript.serialize());
            KeyboardMgr.instance.register("Ctrl-M", () => {
                var t = (<any>m).textArea.value
                loadScript(t, () => {m.dismiss()});
                return false;
            });
            KeyboardMgr.instance.register("Ctrl-B", () => {
                var lines = "";
                var ta = (<any>m).textArea;
                ta.value.split(/\n/).forEach((line:string) => {
                    if (/^meta name \"/.test(line))
                        line = "meta name 'SCRIPTNAME';";
                    if (/^meta stableNames/.test(line)) return;
                    if (line == "") return;
                    lines = lines + "\"" + line.replace(/[\\"]/g, (q) => "\\" + q) + "\\n\"+\n";
                });
                lines = lines.replace(/\+\n$/, "");
                ta.value = lines;
                try {
                    ta.setSelectionRange(0, lines.length);
                } catch(e) { }
                return false;
            });
        }

        private revert()
        {
            ScriptCache.getScriptAsync(ScriptEditorWorldInfo.baseId).then((text) => {
                if (!text) return;
                TheEditor.undoMgr.pushMainUndoState();
                TheEditor.loadScriptTextAsync(ScriptEditorWorldInfo, text, TheEditor.serializeState()).then(() => {
                    this.theScript = null; // prevent commit
                    return TheEditor.saveStateAsync({ forReal: true, isRevert: true }).then(() => {
                        TheEditor.queueNavRefresh();
                        TheEditor.renderDefaultDecl();
                    })
                }).done();
            });
        }

        private mergeWithScript(dialog = false)
        {
            var theMerged : TDev.AST.App = null;
            var id = ScriptEditorWorldInfo.baseId
            if (!id) {
                ModalDialog.info(lf("no can do"), lf("no base script"))
                return;
            }

            TheEditor.saveStateAsync({ forReal: true }).then(() => {
                var m0 = new ModalDialog();
                var popup = HTML.mkTextInput("other_id", lf("other script id"));
                m0.add(div("wall-dialog-body", "other script id: ", popup));
                m0.add(div("wall-dialog-buttons",
                    HTML.mkButton(lf("ok"), () => {
                        m0.canDismiss = false;
                        function doMerge(baseid:string) {
                            Util.log(">>> Merge: merging: base="+baseid+", A=<mine>, b="+popup.value);
                            ScriptCache.getScriptAsync(baseid).then(text => {
                                if (!text) return;
                                var baseapp = AST.Parser.parseScript(text);

                                ScriptCache.getScriptAsync(popup.value).then(text2 => {
                                    if(!text2) return;
                                    var otherapp = AST.Parser.parseScript(text2);
                                    // typecheck the A,B apps
                                    AST.TypeChecker.tcApp(baseapp);
                                    AST.TypeChecker.tcApp(otherapp);

                                    TheEditor.initIds(baseapp);
                                    TheEditor.initIds(TDev.Script);
                                    TheEditor.initIds(otherapp);
                                    theMerged = <TDev.AST.App>(TDev.AST.Merge.merge3(baseapp,TDev.Script,otherapp));
                                    // TODO - do we need "id" in the following?
                                    theMerged.parentIds = [/*id,*/popup.value].concat(otherapp.parentIds);

                                    //Util.log(">>>>>>>> the result: "+theMerged+" : "+(theMerged instanceof TDev.AST.App));
                                    m0.canDismiss = true;
                                    m0.dismiss();
                                    //ScriptProperties.printScript(theMerged);

                                    /*var allHeaders = TDev.Browser.TheHost.installedHeaders.filter(
                                        function(x) { return x.status != "deleted" }
                                    );*/

                                    AST.TypeChecker.tcApp(theMerged); // TODO - turn this off?

                                    if(dialog) {
                                        ModalDialog.showText([baseapp,TDev.Script,otherapp,theMerged]
                                            .map(x => x.serialize())
                                            .join("\n----------\n"));
                                    } else {
                                        /*setGlobalScript(theMerged);
                                        TheEditor.queueNavRefresh(true); // also do typecheck
                                        TheEditor.renderDefaultDecl();*/
                                        TheEditor.loadScriptTextAsync(ScriptEditorWorldInfo, theMerged.serialize(), null)
                                            .then(() => TheEditor.renderDefaultDecl());
                                    }
                                });
                            });
                        }
                        function doFail() {
                            m0.canDismiss = true;
                            m0.dismiss();
                            ModalDialog.info("no can do", "no base script")
                        }

                    })))
                m0.show();
            });
        }

        static mergeScript(info:JsonScript)
        {
            var infos:StringMap<JsonScript> = {}
            var targetHd:Cloud.Header;
            var targetSI:Browser.ScriptInfo;

            Promise.join(Browser.TheHost.getInstalledHeaders().map(h =>
                h.scriptId ? Browser.TheApiCacheMgr.getAsync(h.scriptId, true)
                    .then(r => infos[h.scriptId] = r)
                : Promise.as()))
                .then(() =>
                    Meta.chooseScriptAsync({
                        header: lf("pick a script to merge the changes info"),
                        filter: s => {
                            if (s.getCloudHeader()) {
                                var id = s.getCloudHeader().scriptId
                            if (id && id != info.id && infos[id]) {
                                var inf = infos[id]
                                if (inf.rootid == info.rootid)
                                    return true
                            }
                        }
                        return false
                    }
                    }))
            .then(si => Promise.join(!si ? [] : [
                    ScriptProperties.findAncestorAsync(si.getCloudHeader(), info.id)
                        .then(anc => {
                            // TODO figure out string literal merging
                            if (anc.length == 0) {
                                ModalDialog.info(lf("we have a problem"),
                                            lf("common ancestor of scripts '{0}' and /{1} not found", si.getTitle(), info.id))
                            } else if (anc[0] == info.id) {
                                ModalDialog.info(lf("already done"),
                                            lf("script /{0} is already merged into '{1}'", info.id, si.getTitle()))
                            } else {
                                targetHd = si.getCloudHeader()
                                targetSI = si
                                return ScriptCache.getScriptAsync(anc[0])
                            }
                        }),
                    World.getInstalledScriptAsync(si.getGuid()),
                    ScriptCache.getScriptAsync(info.id)
                ]))
            .then(texts => {
                if (!targetHd) return

                var resApp = AST.mergeScripts(texts[0], texts[1], texts[2])
                var m = ScriptProperties.showDiff(Promise.as(resApp), {
                    "accept": () => {
                        World.getInstalledHeaderAsync(targetHd.guid)
                            .then(hd => {
                                // if it was published - clear the parentIds first
                                if (hd.status == "published")
                                    resApp.parentIds = []
                                resApp.parentIds.push(info.id)
                                return World.updateInstalledScriptAsync(hd, resApp.serialize(), null)
                            })
                            .done(() => {
                                m.dismiss()
                                Browser.TheHost.notifySyncDone()
                                Browser.TheHost.loadDetails(targetSI)
                                Util.setTimeout(500, () => {
                                    // without this line, publishng from the hub leaves behind outdated script page
                                    TheEditor.historyMgr.reload(HistoryMgr.windowHash());
                                });
                            });
                    }
                })
            }).done()
        }

        static findAncestorAsync(target:Cloud.Header, id1:string)
        {
            var getBasesAsync = (id:string) =>
                Browser.TheApiCacheMgr.getAsync(id, true)
                    .then((info:JsonScript):any => {
                        var entries = {}
                        if (info.mergeids)
                            entries = Util.toDictionary(info.mergeids, x => x)
                        if (info.rootid == info.id)
                            return entries
                        return Browser.TheApiCacheMgr.getAsync(id + "/base", true)
                            .then(info2 => {
                                if (info2)
                                    entries[info2.id] = true
                                return entries
                            })
                    })

            var getManyBasesAsync = (ids:string[]) =>
                Promise.join(ids.map(getBasesAsync))
                    .then(r => {
                        var res:StringSet = {}
                        r.forEach(e => Util.setAddTo(res, e))
                        return res
                    })

            var findCommonAsync = (a0:StringSet, a1:StringSet, b0:StringSet, b1:StringSet) =>
                Promise.join([getManyBasesAsync(Object.keys(a1)), getManyBasesAsync(Object.keys(b1))])
                    .then(bases => {
                        var a2 = bases[0]
                        var b2 = bases[1]
                        Util.setAddTo(a0, a2)
                        Util.setAddTo(b0, b2)

                        var res = Object.keys(Util.setIntersect(a0, b0))
                        if (res.length > 0 ||
                            Object.keys(a2).length + Object.keys(b2).length == 0)
                            return Promise.as(res)

                        return findCommonAsync(a0, a2, b0, b2)
                    })

            var aa:StringSet = {}

            if (target.scriptId)
                aa[target.scriptId] = true

            var anyMore = Promise.as();

            if (target.status == "unpublished")
                anyMore = World.getInstalledScriptAsync(target.guid)
                            .then(text => {
                                var app = AST.Parser.parseScript(text, [])
                                app.parentIds.forEach(id => aa[id] = true)
                            })

            return anyMore
                .then(() => {
                    if (aa.hasOwnProperty(id1))
                        return Promise.as([id1])
                    else {
                        var bb:StringSet = {}
                        bb[id1] = true
                        return findCommonAsync(aa, aa, bb, bb)
                    }
                })
        }

        private deployRestApp() {
            return TheEditor.saveStateAsync({ forReal: true }).then(() => {
                var m0 = new ModalDialog();
                var progressBar0 = HTML.mkProgressBar();
                m0.add(progressBar0);
                m0.add(div("wall-dialog-header", lf("export as REST service")));

                var url = HTML.mkTextInput("text", lf("deploy url"));
                url.value = window.localStorage["rest_deploy_url"] || "";
                var path = HTML.mkTextInput("text", lf("deploy path"));
                path.value = window.localStorage["rest_deploy_path"] || "";

                m0.add(div("wall-dialog-body", "url: ", url));
                m0.add(div("wall-dialog-body", "path: ", path));
                var msg = div("wall-dialog-body");
                m0.add(msg);
                m0.add(div("wall-dialog-buttons",
                    HTML.mkButton(lf("export"), () => {
                        window.localStorage["rest_deploy_url"] = url.value;
                        window.localStorage["rest_deploy_path"] = path.value;
                        msg.setChildren("please wait...");
                        progressBar0.start();
                        Util.httpPostJsonAsync(url.value + "/deploy", {
                            compiled: AST.Compiler.getCompiledScript(Script, {
                                packaging: true,
                                rest: true,
                                authorId: Cloud.getUserId(),
                            }).getCompiledCode(),
                            path: path.value
                        }).done((resp) => {
                            msg.setChildren(JSON.stringify(resp));
                            progressBar0.stop();
                        })
                    })))

                m0.show();
            });
        }

        private isActive() { return !!this.theScript; }

        private exportChanged(v:boolean) : void
        {
            if (v)
                ModalDialog.info(lf("allow export to app"), lf("This option only has an effect if you are the author of all base scripts, or if the base script has an effective 'allow other users to export to app' checkmark."));
            this.theScript.allowExport = v;
        }

        private setIconColor(elts:string[], clr:(s:string)=>string, icon:(s:string)=>HTMLElement, setIt:(s:string)=>void)
        {
            var m = new ModalDialog();
            var mkIcon = (path:string) : HTMLElement =>
            {
                var img = icon(path);
                var d = div("selectableIcon", img, div("noDisplay", path)).withClick(() => {
                    setIt(path);
                    m.dismiss();
                    this.commit();
                    this.syncAll();
                });
                d.style.backgroundColor = clr(path);
                d.style.border = "1px dotted #ccc"; // for transparent images
                return d;
            }
            m.choose(elts.map(mkIcon));
        }

        static showIcons()
        {
            var m = new ModalDialog();
            var mkIcon = (path:string) : HTMLElement =>
            {
                var img = HTML.mkImg("svg:" + path +",black")
                var name = div("md-caption", path)
                name.style.fontSize = "0.5em";
                var d = div("selectableIcon", img, name).withClick(() => {
                    ModalDialog.info(path, "was the icon")
                });
                d.style.border = "1px dotted #ccc"; // for transparent images
                return d;
            }
            m.choose(SVG.getIconNames().map(mkIcon));
        }

        private setIcon()
        {
            this.setIconColor(TDev.ScriptIcons.icons,
                         (s) => this.theScript.htmlColor(),
                         (s) => HTML.mkImg("svg:" + s + ",white"),
                         (s) => {
                            this.theScript.icon = s
                         });
        }

        private setArtId(tk: Ticks, search: string, clear: () => void, update: (id: string) => void) {
            tick(tk);

            var buttons: StringMap<() => void> = {};
            buttons[lf("clear")] = () => {
                clear();
                this.commit();
                this.syncAll();
            };
            Meta.chooseArtPictureAsync({ title: lf("choose picture"), initialQuery: search, buttons: buttons })
                .done((art: JsonArt) => {
                    if (art) {
                        update(art.id);
                        this.commit();
                        this.syncAll();
                    }
                });
        }

        private setIconArtId() {
            this.setArtId(Ticks.scriptPropsIconArt, "icon", () => delete this.theScript.iconArtId, (id) => this.theScript.iconArtId = id);
        }

        private setSplashArtId() {
            this.setArtId(Ticks.scriptPropsSplashArt, "splash", () => delete this.theScript.splashArtId, (id) => this.theScript.splashArtId = id);
        }

        private setColor()
        {
            this.setIconColor(TDev.Util.colors,
                         (s) => s,
                         (s) => this.theScript.iconArtId ? ArtUtil.artImg(this.theScript.iconArtId, true) : HTML.mkImg(this.theScript.iconPath()),
                         (s:string) => {
                            this.theScript.color = "#ff" + s.replace("#", "");
                         });
        }

        private syncAll()
        {
            this.scriptName.value = this.theScript.getName();
            this.description.value = this.theScript.comment;
            this.updatePlatformDiv();
            this.pubId.setChildren(ScriptEditorWorldInfo.status !== "published" ? null
                : [lf("published id: "),
                   HTML.mkA("idlink", "https://www.touchdevelop.com/" + ScriptEditorWorldInfo.baseId, "_blank", "/" + ScriptEditorWorldInfo.baseId)]);

            var color = new DeclEntry(lf("color: {0}", this.theScript.htmlColor()));
            color.icon = "";
            color.color = this.theScript.htmlColor();
            color.description = lf("tap to change the color");
            this.colorContainer.setChildren([color.mkBox().withClick(() => this.setColor())]);

            var iconArtId = new DeclEntry(lf("icon art: {0}", this.theScript.iconArtId ? "/" + this.theScript.iconArtId : ""));
            iconArtId.iconArtId = this.theScript.iconArtId;
            iconArtId.icon = "svg:wand,white";
            iconArtId.color = "#ccc";
            iconArtId.description = lf("tap to change the icon picture");
            this.iconArtIdContainer.setChildren([iconArtId.mkBox().withClick(() => this.setIconArtId())]);

            var splashArtId = new DeclEntry(lf("splash screen art: {0}", this.theScript.splashArtId ? "/" + this.theScript.splashArtId : ""));
            splashArtId.iconArtId = this.theScript.splashArtId;
            splashArtId.icon = "svg:wand,white";
            splashArtId.color = "#ccc";
            splashArtId.description = lf("tap to change the splash screen picture");
            this.splashArtIdContainer.setChildren([splashArtId.mkBox().withClick(() => this.setSplashArtId())]);

            HTML.setCheckboxValue(this.isLibrary, this.theScript.isLibrary);
            HTML.setCheckboxValue(this.showAd, this.theScript.showAd);
            HTML.setCheckboxValue(this.allowExport, this.theScript.allowExport);
            HTML.setCheckboxValue(this.isCloud, this.theScript.isCloud);

            this.revertButton.style.display = (ScriptEditorWorldInfo.status !== "published" && ScriptEditorWorldInfo.baseId) ? "inline-block" : "none";

            var mdSet = false;
            if (this.theScript.isLibrary) {
                var docs = ScriptProperties.libraryDocs(this.theScript, this.theScript.getName(), true)
                if (docs) {
                    this.mdRoot.setChildren([ div("varLabel", lf("library documentation")), <any>docs ])
                } else {
                    Browser.setInnerHTML(this.mdRoot,
                        "No library documentation found. Consider <a href='#topic:libraries:docs'>adding some</a>.");
                }
            } else {
                this.mdRoot.setChildren([]);
            }

            TheEditor.toggleWidgetVisibility("scriptPropertiesManagement", this.managementSection);
            TheEditor.toggleWidgetVisibility("scriptPropertiesExport", this.exportSection);
            TheEditor.toggleWidgetVisibility("scriptPropertiesData", this.dataSection);
            TheEditor.toggleWidgetVisibility("scriptPropertiesInstrumentation", this.instrumentationSection);
            TheEditor.toggleWidgetVisibility("scriptPropertiesSettings", this.settingsSection);
            TheEditor.toggleWidgetVisibility("scriptPropertiesPlatform", this.platformSection);
        }

        static libraryDocs(app:AST.App, libname, showCopy : boolean)
        {
            if (!app) return null;
            var acts = <AST.Action[]> app.orderedThings().filter((a) => a instanceof AST.Action && /^example/.test(a.getName()));
            if (acts.length > 0) {
                var md = new MdComments(new Renderer(), libname)
                md.showCopy = showCopy
                var d = div(null);
                try {
                    var prevScript = Script;
                    setGlobalScript(app);
                    Browser.setInnerHTML(d, acts.map((a) => md.extract(a)).join(""));
                    HTML.fixWp8Links(d);
                    Browser.TopicInfo.attachCopyHandlers(d);
                    return d;
                } finally {
                    setGlobalScript(prevScript);
                }
            }
            return null;
        }

        public renderCore(a:AST.Decl) { return this.load(<AST.App>a); }

        private load(a:AST.App) :void
        {
            TheEditor.dismissSidePane();

            if (Collab.AstSession && a.editorState.groupId) {
                var sessionId = Collab.AstSession.servername;
                var groupId = a.editorState.groupId;
                var groupInfo = Browser.TheHost.getGroupInfoById(groupId);
                var button = HTML.mkButton(
                    groupInfo.getTitle(),
                    () => {
                        this.editor.onExitAsync().then(() => {
                            this.editor.hide(true);
                            Browser.TheHost.showList("groups", groupInfo);
                        }).done();
                    }
                );
                groupInfo.withUpdate(button, (g: JsonGroup) => {
                    button.textContent = g.name;
                });

                var line = <HTMLElement> this.formRoot.querySelector(".groupLine");
                line.classList.add("calcButtonsClear");
                line.setChildren([
                    lf("part of group: "),
                    button
                ]);
            }


            Util.assert(a instanceof AST.App);
            this.theScript = a;
            this.editor.displayLeft([this.formRoot]);
            this.scriptName.blur(); // prevent keyboard popup on iOS
            this.syncAll();

            if (TheEditor.blinkElement) {
                var e = elt(TheEditor.blinkElement);
                if (e) {
                    TheEditor.blinkElement = null;
                    Util.ensureVisible(e);
                    Util.coreAnim("blinkLocation", 4000, e);
                }
            }
        }

        private deleteScript()
        {
            ModalDialog.ask("are you sure you want to uninstall this script?", "uninstall",
                () => {
                    TheEditor.uninstallCurrentScriptAsync().done();
                });
        }

        private managePermissions()
        {
            /*
            TheEditor.currentRt.permissionsAsync().done(a => {
                var allowed = Object.keys(a).filter((p) => a[p]);
                var denied = Object.keys(a).filter((p) => !a[p]);

                var msg = ""
                if (allowed.length + denied.length == 0)
                    msg = "This script did not request any permissions yet.";
                else {
                    if (allowed.length)
                        msg += "This script can access: " + allowed.join(", ") + ". ";
                    if (denied.length)
                        msg += "This script is not allowed to access: " + denied.join(", ") + ". ";
                    msg += "To clear permissions use the [delete script data] button.";
                }

                ModalDialog.info("permissions", msg);
            });
            */
        }

        private deleteData() {
            ModalDialog.ask(lf("Are you sure you want to clear all locally stored data (global variables, tables, and indexes) and permissions for this script?"), lf("delete local data"),
                () => {
                    TheEditor.currentRt.datas = {};
                    TheEditor.currentRt.sessions.deleteAllLocalDataAsync(Script.localGuid).done(() => {
                        HTML.showProgressNotification(lf("puff! gone."));
                    });
                });
        }

        private manageSessions() {
            if (!TheEditor.currentRt.sessions.enable_script_session_mgt())
                ModalDialog.info(lf("not available"),
                    lf("No cloud session information found. Either this script does not have cloud data, was not run yet, or you are not signed in."))
            else {
                TDev.RT.CloudData.scriptSessionsDialog(TheEditor.currentRt).done();
            }
        }

        public commit()
        {
            if (!this.theScript) return;

            this.theScript.setName(this.scriptName.value);
            this.theScript.comment = this.description.value;
            this.theScript.notifyChange();
            TheEditor.queueNavRefresh();
        }
    }
}
