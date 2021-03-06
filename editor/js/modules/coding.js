var CodingModule = //do not change
{
	name: "Code",
	bigicon: "imgs/tabicon-code.png",

	default_sceneview: true,
	sceneview_visible: true, //side panel

	APIs: {}, //here you can register function calls of the API
	windows: [], //external windows

	init: function()
	{
		if(!gl)
			return;

		this.tab = LiteGUI.main_tabs.addTab( this.name, {
			id:"codingtab",
			bigicon: this.bigicon,
			size: "full", 
			callback: function(tab) {

				/*
				if(CodingModule.editor)
					CodingModule.editor.refresh();
				*/
				if(!CodingModule.external_window)
					CodingModule.show3DWindow( CodingModule.default_sceneview );

				InterfaceModule.setSidePanelVisibility(false);
			},
			callback_canopen: function(){
				//avoid opening the tab if it is in another window
				if(CodingModule.external_window)
					return false;
			},
			callback_leave: function() {
				RenderModule.appendViewportTo(null);
				//CodingModule.assignCurrentCode();
		}});

		this.root = LiteGUI.main_tabs.getTab(this.name).content;

		//tabs for every file
		//register some APIs used for autocompletion
		this.registerAPI("glsl", ["texture2D","sampler2D","uniform","varying","radians","degrees","sin","cos","tan","asin","acos","atan","pow","exp","log","exp2"] );
		this.registerAPI("glsl", ["IN.color","IN.vertex","IN.normal","IN.uv","IN.uv1","IN.camPos","IN.viewDir","IN.worldPos","IN.worldNormal","IN.screenPos"] );
		this.registerAPI("glsl", ["OUT.Albedo","OUT.Normal","OUT.Emission","OUT.Specular","OUT.Gloss","OUT.Alpha","OUT.Reflectivity"] );

		LiteGUI.menubar.add("Window/Coding Panel", { callback: function(){ CodingTabsWidget.createDialog(); }});
		LiteGUI.menubar.add("Actions/Catch Errors", { type: "checkbox", instance: LS, property: "catch_errors" });

		var coding_area = this.coding_area = new LiteGUI.Area("codearea",{height: -30});
		this.root.appendChild( coding_area.root );
		coding_area.split("horizontal",[null,"50%"],true);
		this.coding_3D_area = coding_area.getSection(0).content;

		var coding_tabs_widget = this.coding_tabs_widget = new CodingTabsWidget();
		coding_area.getSection(1).add( coding_tabs_widget );
	},

	//registers a coding API (help, links to wiki, autocompletion, etc)
	registerAPI: function( lang, funcs )
	{
		var API = this.APIs[lang];
		if( !this.APIs[lang] )
			API = this.APIs[lang] = {};

		for(var i in funcs)
			API[ funcs[i] ] = true;
	},

	//open coding tab
	openTab: function()
	{
		LiteGUI.main_tabs.selectTab( this.name );
		this.show3DWindow( true );
	},

	//close coding tab ( back to scene view )
	closeTab: function()
	{
		LiteGUI.main_tabs.selectTab( RenderModule.name );
	},

	//switch coding tab
	editInstanceCode: function( instance, options, open_tab )
	{
		options = options || {};
		var lang = options.lang || "javascript";

		if(open_tab)
			this.openTab();

		this.coding_tabs_widget.editInstanceCode( instance, options );
	},

	closeInstanceTab: function( instance, options )
	{
		return this.coding_tabs_widget.closeInstanceTab( instance, options );
	},

	onNewScript: function( node )
	{
		var component = new LS.Components.Script();
		node = node || SelectionModule.getSelectedNode();
		if(!node)
			node = LS.GlobalScene.root;
		node.addComponent( component );
		this.openTab();
		this.editInstanceCode( component, { id: component.uid, title: node.id, lang: "javascript", path: component.uid, help: LS.Components.Script.coding_help });
	},

	/*
	detachWindow: function()
	{
		var that = this;
		var main_window = window;

		if(!this.external_window)
		{
			this.show3DWindow(false);
			this.external_window = LiteGUI.main_tabs.detachTab( this.name, null, function(){
				that.external_window = null;
			});
		}
		else
		{
			this.external_window.close();
		}
	},

	createCodingWindow: function()
	{
		var extra_window = LiteGUI.newWindow("Code",800,600);
		this.windows.push( extra_window );
	},
	*/

	//shows the side 3d window
	show3DWindow: function(v)
	{
		this.sceneview_visible = v;
		if(v)
		{
			RenderModule.appendViewportTo( this.coding_area.sections[0].content );
			this.coding_area.showSection(0);
		}
		else
		{
			RenderModule.appendViewportTo(null);
			this.coding_area.hideSection(0);
		}
	},

	onUnload: function()
	{
		if(this.external_window)
			this.external_window.close();
	}

};

CORE.registerModule( CodingModule );

/* editors **************************************/

LS.Components.Script["@inspector"] = function(component, attributes)
{
	attributes.addString("Name", component.name, { callback: function(v) { 
		component.name = v;
		LEvent.trigger( LS.Components.Script, "renamed", component );
		//CodingModule.onScriptRenamed( component );
	}});

	var context = component.getContext();
	if(context)
	{
		attributes.addTitle("Variables");
		this.showObjectFields(context, attributes);

		var actions = [];
		/*
		for(var i in context)
		{
			if( typeof(context[i]) != "function" || LS.Components.Script.exported_callbacks.indexOf(i) != -1 || i == "getResources" )
				continue;
			attributes.addButton(null,i, { callback: context[i].bind(context) });
		}
		*/
	}

	//attributes.addString("Module name", component.component_name, { callback: function(v) { component.component_name = v; } });
	//attributes.addTextarea(null, component.code, { disabled: true, height: 100 });
	attributes.addButton(null,"Edit Code", { callback: function() {
		CodingModule.openTab();
		var path = component.uid;
		CodingModule.editInstanceCode(component, { id: component.uid, title: component._root.id, lang: "javascript", path: path, help: LS.Components.Script.coding_help } );
	}});
	//attributes.addCheckbox("Register", component.register_component, { callback: function(v) { component.register_component = v; } });
}

LS.Components.Script.onComponentInfo = function( component, widgets )
{
	widgets.addString("Context Locator", component.getLocator() + "/context", { disabled: true } );
	var values = [""];
	var context = component.getContext();
	if(context)
	{
		for(var i in context)
		{
			var f = context[i];
			if( typeof(f) != "function")
				continue;
			values.push(i);
		}
		widgets.addCombo("Functions", "", { values: values, callback: function(v){ 
		}});
	}
}

//to write a tiny code snippet
LiteGUI.Inspector.prototype.addCode = function( name, value, options )
{
	options = options || {};
	value = value || "";
	var that = this;
	this.values[ name ] = value;

	var element = null;

	var instance = options.instance || {};
	var uid = instance.uid || ("code_" + this.tab_index);
	var instance_settings = { 
		id: uid,
		path: instance.uid,
		title: uid
	};
	//getCode: function(){ return instance[name];},
	//setCode: function(v){ instance[name] = v;}

	if(!options.allow_inline)
	{
		var text = "Edit Code";
		element = this.createWidget(name,"<button class='single' tabIndex='"+ this.tab_index + "'>"+text+"</button>", options);
		var button = element.querySelector("button");
		button.addEventListener("click", function() {
			CodingModule.openTab();
			CodingModule.editInstanceCode( instance, instance_settings );
		});
	}
	else
	{
		element = inspector.addContainer( null, { height: 300} );

		var codepad = new CodingPadWidget();
		element.appendChild( codepad.root );
		codepad.editInstanceCode( instance, instance_settings );
		codepad.top_widgets.addButton(null,"In Editor",{ callback: function() { 
			if(options.callback_button)
				options.callback_button();
			inspector.refresh();
			CodingModule.openTab();
			CodingModule.editInstanceCode( instance, instance_settings );
		}});
	}

	this.tab_index += 1;
	this.append( element );
	return element;
}

LiteGUI.Inspector.widget_constructors["code"] = "addCode";
