COMPONENT('click', function() {
	var self = this;

	self.readonly();

	self.click = function() {
		var value = self.attr('data-value');
		if (typeof(value) === 'string')
			self.set(self.parser(value));
		else
			self.get(self.attr('data-component-path'))(self);
	};

	self.make = function() {

		self.element.on('click', self.click);

		var enter = self.attr('data-enter');
		if (!enter)
			return;

		$(enter).on('keydown', 'input', function(e) {
			if (e.keyCode !== 13)
				return;
			setTimeout(function() {
				if (self.element.get(0).disabled)
					return;
				self.click();
			}, 100);
		});
	};
});

COMPONENT('visible', function() {
	var self = this;
	var condition = self.attr('data-if');
	self.readonly();
	self.setter = function(value) {

		var is = true;

		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? true : false;

		self.element.toggleClass('hidden', !is);
	};
});

COMPONENT('textboxlist', function() {
	var self = this;
	var container;
	var empty = {};
	var skip = false;

	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}" value="{{ value }}" /></div></div>');
	self.make = function() {

		empty.max = (self.attr('data-maxlength') || '100').parseInt();
		empty.placeholder = self.attr('data-placeholder');
		empty.value = '';

		var html = self.html();
		var icon = self.attr('data-icon');

		if (icon)
			icon = '<i class="fa {0}"></i>'.format(icon);

		self.toggle('ui-textboxlist');
		self.html((html ? '<div class="ui-textboxlist-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');

		self.element.on('click', '.fa-times', function() {
			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;
			arr.splice(index, 1);
			skip = true;
			self.set(self.path, arr, 2);
		});

		self.element.on('change keypress', 'input', function(e) {

			if (e.type !== 'change' && e.keyCode !== 13)
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base').length > 0;

			if (base && e.type === 'change')
				return;

			if (base) {
				self.get().indexOf(value) === -1 && self.push(self.path, value, 2);
				this.value = '';
				return;
			}

			container.find('input').each(function() {
				arr.push(this.value.trim());
			});

			skip = true;
			self.set(self.path, arr, 2);
		});
	};

	self.setter = function(value, path, type) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			container.empty();
			return;
		}

		var builder = [];

		value.forEach(function(item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('message', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-message hidden');

		self.element.on('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			if (!visible)
				return;
			if (e.keyCode === 27)
				self.hide();
		});
	};

	self.warning = function(message, icon) {
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.success = function(message, icon) {
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.element.removeClass('ui-message-visible');
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {

		if (!is)
			self.html('<div><div class="ui-message-body"><span class="fa fa-warning"></span><div class="ui-center"></div></div><button>' + (self.attr('data-button') || 'Close') + '</button></div>');

		if (timer)
			clearTimeout(timer);

		visible = true;
		self.element.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.element.find('.fa').removeClass().addClass('fa ' + icon);
		self.element.find('.ui-center').html(text);
		self.element.removeClass('hidden');
		setTimeout(function() {
			self.element.addClass('ui-message-visible');
		}, 5);
	};
});

COMPONENT('validation', function() {

	var self = this;
	var path;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find(self.attr('data-selector') || 'button');
		elements.prop({ disabled: true });
		self.evaluate = self.attr('data-if');
		path = self.path.replace(/\.\*$/, '');
		self.watch(self.path, self.state, true);
	};

	self.state = function() {
		var disabled = jC.disabled(path);
		if (!disabled && self.evaluate)
			disabled = !EVALUATE(self.path, self.evaluate);
		elements.prop({ disabled: disabled });
	};
});

COMPONENT('checkbox', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';

	self.validate = function(value) {
		var is = false;
		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		return value === 'true' || value === 'on';
	};

	if (!required)
		self.noValid();

	self.make = function() {
		self.element.addClass('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), required ? ' class="ui-checkbox-label-required"' : ''));
		self.element.on('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.element.toggleClass('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('dropdown', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var select;
	var container;

	self.validate = function(value) {

		var type = typeof(value);

		if (select.prop('disabled'))
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		if (window.$calendar)
			window.$calendar.hide();

		if (self.type === 'currency' || self.type === 'number')
			return value > 0;

		return value.length > 0;
	};

	if (!required)
		self.noValid();

	self.render = function(arr) {

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = self.attr('data-source-text') || 'name';
		var propValue = self.attr('data-source-value') || 'id';
		var emptyText = self.attr('data-empty');

		if (emptyText !== undefined)
			builder.push('<option value="">{0}</option>'.format(emptyText));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		select.html(builder.join(''));

		var disabled = arr.length === 0;
		select.parent().toggleClass('ui-disabled', disabled);
		select.prop('disabled', disabled);
	};

	self.make = function() {

		var options = [];

		(self.attr('data-options') || '').split(';').forEach(function(item) {
			item = item.split('|');
			options.push('<option value="{0}">{1}</option>'.format(item[1] === undefined ? item[0] : item[1], item[0]));
		});

		self.element.addClass('ui-dropdown-container');

		var label = self.html();
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-component-bind="">{0}</select></div>'.format(options.join(''));
		var builder = [];

		if (label.length) {
			var icon = self.attr('data-icon');
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(required ? ' ui-dropdown-label-required' : '', icon ? '<span class="fa {0}"></span> '.format(icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).addClass('ui-dropdown-values');

		select = self.find('select');
		container = self.find('.ui-dropdown');

		var ds = self.attr('data-source');
		if (!ds)
			return;

		var prerender = function(path) {
			var value = self.get(self.attr('data-source'));
			if (NOTMODIFIED(self.id, value))
				return;
			if (!value)
				value = [];
			self.render(value);
		};

		self.watch(ds, prerender, true);
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-dropdown-invalid', self.isInvalid());
	};
});

COMPONENT('textbox', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var input;
	var container;

	self.validate = function(value) {

		var is = false;
		var type = typeof(value);

		if (input.prop('disabled'))
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		if (window.$calendar)
			window.$calendar.hide();

		if (self.type === 'email')
			return value.isEmail();
		if (self.type === 'currency')
			return value > 0;
		return value.length > 0;
	};

	if (!required)
		self.noValid();

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('type', self.type === 'password' ? self.type : 'text');
		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-component-keypress', self.attr('data-component-keypress'));
		attrs.attr('data-component-keypress-delay', self.attr('data-component-keypress-delay'));
		attrs.attr('data-component-bind', '');

		tmp = self.attr('data-align');
		if (tmp)
			attrs.attr('class', 'ui-' + tmp);

		if (self.attr('data-autofocus') === 'true')
			attrs.attr('autofocus');

		var content = self.html();
		var icon = self.attr('data-icon');
		var icon2 = self.attr('data-control-icon');
		var text = self.attr('data-control-text');
		var increment = self.attr('data-increment') === 'true';

		if (!icon2 && self.type === 'date')
			icon2 = 'fa-calendar';

		builder.push('<input {0} />'.format(attrs.join(' ')));

		if (icon2)
			builder.push('<div><span class="fa {0}"></span></div>'.format(icon2));
		else if (text)
			builder.push('<div style="font-size:10px">{0}</div>'.format(text));
		else if (increment)
			builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');

		if (increment) {
			self.element.on('click', '.fa-caret-up,.fa-caret-down', function(e) {
				var el = $(this);
				var inc = -1;
				if (el.hasClass('fa-caret-up'))
					inc = 1;
				self.change(true);
				self.inc(inc);
			});
		}

		if (self.type === 'date') {
			self.element.on('click', '.fa-calendar', function(e) {
				e.preventDefault();
				if (!window.$calendar)
					return;
				var el = $(this);
				window.$calendar.toggle(el.parent().parent(), self.element.find('input').val(), function(date) {
					self.set(date);
				});
			});
		}

		if (!content.length) {
			self.element.addClass('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.find('.ui-textbox');
			return;
		}

		var html = builder.join('');
		builder = [];
		builder.push('<div class="ui-textbox-label{0}">'.format(required ? ' ui-textbox-label-required' : ''));

		if (icon)
			builder.push('<span class="fa {0}"></span> '.format(icon));

		builder.push(content);
		builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.element.addClass('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', self.isInvalid());
	};
});

COMPONENT('textboxsearch', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var input;
	var container;
	var icon;

	self.validate = function(value) {

		var is = false;
		var type = typeof(value);

		if (input.prop('disabled'))
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		if (window.$calendar)
			window.$calendar.hide();

		return value.length > 0;
	};

	!required && self.noValid();

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('type', 'text');
		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-component-keypress', self.attr('data-component-keypress'));
		attrs.attr('data-component-keypress-delay', self.attr('data-component-keypress-delay'));
		attrs.attr('data-component-bind', '');

		tmp = self.attr('data-align');
		tmp && attrs.attr('class', 'ui-' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');

		var content = self.html();
		builder.push('<input {0} />'.format(attrs.join(' ')));
		builder.push('<div><span class="fa fa-search"></span></div>');

		var html = builder.join('');

		builder = [];
		builder.push('<div class="ui-textbox-label{0}">'.format(required ? ' ui-textbox-label-required' : ''));
		builder.push(content);
		builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.element.addClass('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');

		icon = self.find('.fa');

		self.element.on('click', '.fa-times', function() {
			self.set('');
		});

		self.watch(function(path, value) {
			icon.toggleClass('fa-search', value ? false : true).toggleClass('fa-times', value ? true : false);
		});
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', self.isInvalid());
	};
});

COMPONENT('textarea', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';

	this.validate = function(value) {
		var is = false;
		var t = typeof(value);

		if (t === 'undefined' || t === 'object')
			value = '';
		else
			value = value.toString();

		is = isRequired ? self.type === 'number' ? value > 0 : value.length > 0 : true;
		return is;
	};

	self.make = function() {

		var attrs = [];

		function attr(name) {
			var a = self.attr(name);
			if (!a)
				return;
			attrs.push(name.substring(name.indexOf('-') + 1) + '="' + a + '"');
		}

		attr('data-placeholder');
		attr('data-maxlength');

		if (self.attr('data-readonly'))
			attrs.push('readonly="readonly"');

		var element = self.element;
		var height = element.attr('data-height');
		var icon = element.attr('data-icon');
		var content = element.html();
		var html = '<textarea data-component-bind=""' + (attrs.length > 0 ? ' ' + attrs.join('') : '') + (height ? ' style="height:' + height + '"' : '') + (element.attr('data-autofocus') === 'true' ? ' autofocus="autofocus"' : '') + '></textarea>';

		if (content.length === 0) {
			element.addClass('ui-textarea');
			element.append(html);
			return;
		}

		element.empty();
		element.append('<div class="ui-textarea-label' + (isRequired ? ' ui-textarea-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
		element.append('<div class="ui-textarea">' + html + '</div>');
	};

	self.state = function(type) {
		self.element.find('.ui-textarea').toggleClass('ui-textarea-invalid', self.isInvalid());
	};
});

COMPONENT('template', function() {
	var self = this;
	self.readonly();
	self.make = function(template) {

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.element.find('script');

		if (!script.length) {
			script = self.element;
			self.element = self.element.parent();
		}

		self.template = Tangular.compile(script.html());
		script.remove();
	};

	self.setter = function(value) {
		if (NOTMODIFIED(self.id, value))
			return;
		if (!value)
			return self.element.addClass('hidden');
		KEYPRESS(function() {
			self.html(self.template(value)).removeClass('hidden');
		}, 100, self.id);
	};
});

COMPONENT('repeater', function() {

	var self = this;
	var recompile = false;

	self.readonly();

	self.make = function() {
		var element = self.element.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-component="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			builder.push(self.template(item).replace(/\$index/g, i.toString()).replace(/\$/g, self.path + '[' + i + ']'));
		}

		self.html(builder);

		if (recompile)
		   jC.compile();
	};
});

COMPONENT('error', function() {
	var self = this;
	var element;

	self.readonly();

	self.make = function() {
		self.element.append('<ul class="ui-error hidden"></ul>');
		element = self.element.find('ul');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			element.addClass('hidden');
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<li><span class="fa fa-times-circle"></span> ' + value[i].error + '</li>');

		element.empty();
		element.append(builder.join(''));
		element.removeClass('hidden');
	};
});

COMPONENT('page', function() {
	var self = this;
	var isProcessed = false;
	var isProcessing = false;
	var reload = self.attr('data-reload');

	self.hide = function() {
		self.set('');
	};

	self.getter = null;
	self.setter = function(value) {

		if (isProcessing)
			return;

		var el = self.element;
		var is = el.attr('data-if') == value;

		if (isProcessed || !is) {
			el.toggleClass('hidden', !is);

			if (is && reload)
				self.get(reload)();

			return;
		}

		var loading = FIND('loading');
		loading.show();
		isProcessing = true;
		INJECT(el.attr('data-template'), el, function() {
			isProcessing = false;

			var init = el.attr('data-init');
			if (init) {
				var fn = GET(init || '');
				if (typeof(fn) === 'function')
					fn(self);
			}

			isProcessed = true;
			el.toggleClass('hidden', !is);
			loading.hide(1200);
		});
	};
});

COMPONENT('form', function() {

	var self = this;
	var autocenter;
	window.$$form_level = window.$$form_level || 1;

	if (!MAN.$$form) {
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($.components.findById($(this).attr('data-id')).path, '');
			window.$$form_level--;
		});

		$(window).on('resize', function() {
			FIND('form', true).forEach(function(component) {
				if (component.element.hasClass('hidden'))
					return;
				component.resize();
			});
		});
	}

	self.onHide = function(){};

	var hide = self.hide = function() {
		self.set('');
		self.onHide();
	};

	self.readonly();
	self.submit = function(hide) { self.hide(); };
	self.cancel = function(hide) { self.hide(); };

	self.resize = function() {
		if (!autocenter)
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(window).height();

		var r = (wh / 2) - (fh / 2);
		if (r > 30)
			ui.css({ marginTop: (r - 15) + 'px' });
		else
			ui.css({ marginTop: '20px' });
	};

	self.make = function() {
		var content = self.element.html();
		var width = self.attr('data-width') || '800px';
		var submit = self.attr('data-submit');
		var enter = self.attr('data-enter');

		autocenter = self.attr('data-autocenter') !== 'false';
		self.condition = self.attr('data-if');
		self.element.empty();

		$(document.body).append('<div id="' + self._id + '" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:' + width + '"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-id="' + self.id + '"></span>' + self.attr('data-title') + '</div>' + content + '</div></div>');

		self.element = $('#' + self._id);
		self.element.data(COM_ATTR, self);

		self.element.on('scroll', function() {
			if (window.$calendar)
				window.$calendar.hide();
		});

		self.element.find('button').on('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			window.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(hide);
					break;
				case 'cancel':
					if (!this.disabled)
						self[this.name](hide);
					break;
			}
		});

		if (enter === 'true') {
			self.element.on('keydown', 'input', function(e) {
				if (e.keyCode !== 13)
					return;
				var btn = self.element.find('button[name="submit"]');
				if (btn.get(0).disabled)
					return;
				self.submit(hide);
			});
		}

		return true;
	};

	self.getter = null;
	self.setter = function(value) {

		var isHidden = !EVALUATE(self.path, self.condition);
		self.element.toggleClass('hidden', isHidden);

		if (window.$calendar)
			window.$calendar.hide();

		if (!isHidden) {
			self.resize();
			var el = self.element.find('input,select,textarea');
			if (el.length > 0)
				el.eq(0).focus();

			window.$$form_level++;
			self.element.css('z-index', window.$$form_level * 10);

			self.element.animate({ scrollTop: 0 }, 0, function() {
				setTimeout(function() {
					self.element.find('.ui-form').addClass('ui-form-animate');
				}, 300);
			});

		} else
			self.element.find('.ui-form').removeClass('ui-form-animate');
	};
});

COMPONENT('fileupload', function() {

	var self = this;
	var customvalue = null;
	var loader;

	self.error = function(err) {};
	self.noValid();
	self.setter = null;
	self.getter = null;

	var isRequired = this.element.attr('data-required') === 'true';

	self.custom = function(val) {
		customvalue = val;
		return self;
	};

	self.make = function() {

		var element = this.element;
		var content = self.html();
		var placeholder = self.attr('data-placeholder');
		var icon = self.attr('data-icon');
		var accept = self.attr('data-accept');
		var url = self.attr('data-url');

		if (!url) {
			if (window.managerurl)
				url = window.managerurl + '/upload/';
			else
				url = location.pathname
		}

		var multiple = self.attr('data-multiple') === 'true';
		var html = '<span class="fa fa-folder"></span><input type="file"' + (accept ? ' accept="' + accept + '"' : '') + (multiple ? ' multiple="multiple"' : '') + ' class="ui-fileupload-input" /><input type="text" placeholder="' + (placeholder ? placeholder : '') + '" readonly="readonly" />';

		if (content.length) {
			element.empty();
			element.append('<div class="ui-fileupload-label' + (isRequired ? ' ui-fileupload-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			element.append('<div class="ui-fileupload">' + html + '</div>');
		} else {
			element.addClass('ui-fileupload');
			element.append(html);
		}

		element.append('<div class="ui-fileupload-progress hidden"><div style="width:0%"></div></div>');
		loader = element.find('.ui-fileupload-progress').find('div');

		element.find('.ui-fileupload-input').on('change', function(evt) {

			var files = evt.target.files;
			var filename = [];
			var el = this;
			$(el).parent().find('input[type="text"]').val(filename.join(', '));

			var data = new FormData();
			for (var i = 0, length = files.length; i < length; i++)
				data.append('file' + i, files[i]);

			if (customvalue)
				data.append('custom', customvalue);

			var loading = FIND('loading');
			if (loading)
				loading.show();

			COM.UPLOAD(url, data, function(response, err) {

				if (err) {

					if (loading)
						loading.hide(500);

					var message = FIND('message');
					if (message)
						message.warning(self.attr('data-error-large'));
					else
						alert(self.attr('data-error-large'));

					return;
				}

				self.change();
				el.value = '';

				if (self.attr('data-extension') === 'false') {
					for (var i = 0, length = response.length; i < length; i++) {
						var filename = response[i];
						var index = filename.lastIndexOf('.');
						if (index === -1)
							continue;
						response[i] = filename.substring(0, index);
					}
				}

				if (self.attr('data-singlefile') === 'true')
					self.set(response);
				else
					self.push(response);

				if (loading)
					loading.hide(500);

				loader.css({ width: 0 });
				loader.parent().removeClass('hidden');
			}, function(percentage) {
				loader.animate({ width: percentage + '%' }, 300);
				if (percentage !== 100)
					return;
				setTimeout(function() {
					loader.parent().addClass('hidden');
				}, 1000);
			});
		});
	};
});

COMPONENT('codemirror', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var skipA = false;
	var skipB = false;
	var editor;
	var timeout;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.make = function() {

		var height = self.element.attr('data-height');
		var icon = self.element.attr('data-icon');
		var content = self.element.html();

		self.element.empty();
		self.element.append('<div class="ui-codemirror-label' + (required ? ' ui-codemirror-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div><div class="ui-codemirror"></div>');
		var container = self.element.find('.ui-codemirror');

		editor = CodeMirror(container.get(0), { lineNumbers: self.attr('data-linenumbers') === 'true', mode: self.attr('data-type') || 'htmlmixed', indentUnit: 4 });

		if (height !== 'auto')
			editor.setSize('100%', height || '200px');

		editor.on('change', function(a, b) {

			if (skipB && b.origin !== 'paste') {
				skipB = false;
				return;
			}

			clearTimeout(timeout);
			timeout = setTimeout(function() {
				skipA = true;
				self.reset(true);
				self.dirty(false);
				self.set(editor.getValue());
			}, 200);
		});

		skipB = true;
	};

	self.getter = null;
	self.setter = function(value, path) {

		if (skipA === true) {
			skipA = false;
			return;
		}

		skipB = true;
		editor.setValue(value || '');
		editor.refresh();
		skipB = true;

		CodeMirror.commands['selectAll'](editor);
		var f = editor.getCursor(true);
		var t = editor.getCursor(false);
		skipB = true;
		editor.setValue(editor.getValue());
		skipB = true;

		setTimeout(function() {
			editor.refresh();
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);
	};

	self.state = function(type) {
		self.element.find('.ui-codemirror').toggleClass('ui-codemirror-invalid', self.isInvalid());
	};
});

/**
 * Confirm Message
 * @version 1.0.0
 */
COMPONENT('confirm', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-confirm hidden');
		self.element.on('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {

		if (self.callback)
			self.callback(index);

		self.element.removeClass('ui-confirm-visible');
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {

		if (!is)
			self.html('<div><div class="ui-confirm-body"></div></div>');

		if (timer)
			clearTimeout(timer);

		visible = true;
		self.element.find('.ui-confirm-body').empty().append(text);
		self.element.removeClass('hidden');
		setTimeout(function() {
			self.element.addClass('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-loading');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.element.toggleClass('hidden', false);
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.element.toggleClass('hidden', true);
		}, timeout || 1);
		return self;
	};
});

COMPONENT('range', function() {
	var self = this;
	var required = self.attr('data-required');

	self.noValid();

	self.make = function() {
		var name = self.html();
		if (name)
			name = '<div class="ui-range-label{1}">{0}:</div>'.format(name, required ? ' ui-range-label-required' : '');
		var attrs = [];
		attrs.attr('step', self.attr('data-step'));
		attrs.attr('max', self.attr('data-max'));
		attrs.attr('min', self.attr('data-min'));
		self.element.addClass('ui-range');
		self.html('{0}<input type="range" data-component-keypress-delay="100" data-component-bind=""{1} />'.format(name, attrs.length ? ' ' + attrs.join(' ') : ''));
	};
});

jC.parser(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value;

		if (!value)
			return null;

		var isEN = value.indexOf('.') === -1;
		var tmp = isEN ? value.split('-') : value.split('.');
		if (tmp.length !== 3)
			return null;
		var dt = isEN ? new Date(parseInt(tmp[0]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[2], 10) || 0) : new Date(parseInt(tmp[2]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[0], 10) || 0);
		return dt;
	}

	return value;
});

jC.formatter(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value.format(this.attr('data-component-format'));
		if (!value)
			return value;
		return new Date(Date.parse(value)).format(this.attr('data-component-format'));
	}

	if (type !== 'currency')
		return value;

	if (typeof(value) !== 'number') {
		value = parseFloat(value);
		if (isNaN(value))
			value = 0;
	}

	return value.format(2);
});

/**
 * Tagger
 * @version 1.0.0
 */
COMPONENT('tagger', function() {

	var self = this;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find('[data-name]');
		elements.each(function() {
			this.$tagger = {};
			this.$tagger.def = this.innerHTML;
		});
	};

	self.arrow = function(value) {
		return FN(value.replace(/\&gt\;/g, '>').replace(/\&lt\;/g, '<').replace(/\&amp\;/g, '&'));
	};

	self.setter = function(value) {

		if (!value) {
			self.element.addClass('hidden');
			return;
		}

		// self.element.toggleClass('transparent', true).removeClass('hidden');
		elements.each(function() {

			var name = this.getAttribute('data-name');
			var format = this.getAttribute('data-format');
			var type = this.getAttribute('data-type');
			var visible = this.getAttribute('data-visible');
			var before = this.getAttribute('data-before');
			var after = this.getAttribute('data-after');
			var val = name ? GET(name, value) : value;
			var key;
			var cache = this.$tagger;

			if (format) {
				key = 'format';
				if (!cache[key])
					format = cache[key] = self.arrow(format);
				else
					format = cache[key];
			}

			var typeval = typeof(val);

			switch (type) {
				case 'date':
					if (typeval === 'string')
						val = val.parseDate();
					else if (typeval === 'number')
						val = new Date(val);
					else
						val = '';
					break;

				case 'number':
				case 'currency':
					if (typeval === 'string')
						val = val.parseFloat();
					if (typeof(val) !== 'number')
						val = '';
					break;
			}

			if ((val || val === 0) && format)
				val = format(val);

			if (visible) {
				key = 'visible';
				if (!cache[key])
					visible = cache[key] = self.arrow(visible);
				else
					visible = cache[key];
				var is = visible(val);
				$(this).toggleClass('hidden', !is);
				return;
			}

			val = val === null || val === undefined ? '' : val.toString();

			if (val && !format)
				val = Ta.helpers.encode(val);

			if (val) {
				if (this.innerHTML !== val)
					this.innerHTML = (before ? before : '') + val + (after ? after : '');
				return;
			}

			if (this.innerHTML !== cache.def)
				this.innerHTML = cache.def;
		});
		self.element.removeClass('transparent hidden');
	};
});

COMPONENT('importer', function() {
	var self = this;
	var imported = false;
	var reload = self.attr('data-reload');

	self.readonly();
	self.setter = function(value) {

		if (!self.evaluate(self.attr('data-if')))
			return;

		if (imported) {
			if (reload)
				return EXEC(reload);
			self.setter = null;
			return;
		}

		imported = true;
		IMPORT(self.attr('data-url'), function() {
			if (reload)
				return EXEC(reload);
			self.remove();
		});
	};
});

COMPONENT('disable', function() {
	var self = this;
	var condition = self.attr('data-if');
	var selector = self.attr('data-selector') || 'input,texarea,select';
	var validate = self.attr('data-validate');

	if (validate)
		validate = validate.split(',').trim();

	self.readonly();

	self.setter = function(value) {
		var is = true;

		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? false : true;

		self.find(selector).each(function() {
			var el = $(this);
			var tag = el.get(0).tagName;
			if (tag === 'INPUT' || tag === 'SELECT') {
				el.prop('disabled', is);
				el.parent().toggleClass('ui-disabled', is);
				return;
			}
			el.toggleClass('ui-disabled', is);
		});

		validate && validate.forEach(function(key) { jC.reset(key); });
	};

	self.state = function(type) {
		self.update();
	};
});
